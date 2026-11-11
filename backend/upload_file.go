package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

const (
	// uploadFilePath is the HTTP path of the file upload endpoint.
	uploadFilePath = "/files"

	// maxUploadFileSize is the largest file accepted by the upload endpoint.
	// The frontend limits images and audio files to 4 MiB.
	maxUploadFileSize = 5 << 20

	// maxUploadRequestSize leaves room for the multipart envelope.
	maxUploadRequestSize = maxUploadFileSize + 64<<10

	// dailyUploadQuota is the number of bytes one user can upload per day.
	// Uploaded files are kept forever: this bounds what one account can store.
	dailyUploadQuota = 20 << 20

	// dailyTotalUploadQuota is the number of bytes all users together can
	// upload per day. It bounds how fast many accounts can fill the IPFS
	// node's StorageMax (ipfs/zenao-config.sh).
	dailyTotalUploadQuota = 1 << 30

	// totalQuotaKey is the single key of the all-users quota.
	totalQuotaKey = "all-users"
)

// uploadFileHandler stores a file on IPFS for an authenticated, non-banned
// user. It replaces the former Next.js route /api/files and keeps its
// contract: multipart field "file" in, {"uri": "ipfs://<cid>"} out.
type uploadFileHandler struct {
	logger      *zap.Logger
	auth        zeni.Auth
	store       FileStore
	maintenance bool
	limiter     *RateLimiter
	quota       *uploadQuota // per user
	totalQuota  *uploadQuota // all users together
}

var _ http.Handler = (*uploadFileHandler)(nil)

func newUploadFileHandler(logger *zap.Logger, auth zeni.Auth, store FileStore, maintenance bool) *uploadFileHandler {
	return &uploadFileHandler{
		logger:      logger,
		auth:        auth,
		store:       store,
		maintenance: maintenance,
		// Per-user limit: one upload every 2 seconds on average, bursts of 10.
		limiter:    NewRateLimiter(0.5, 10, 10*time.Minute),
		quota:      newUploadQuota(dailyUploadQuota, 24*time.Hour),
		totalQuota: newUploadQuota(dailyTotalUploadQuota, 24*time.Hour),
	}
}

func (h *uploadFileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeUploadError(w, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}
	if h.maintenance {
		writeUploadError(w, http.StatusServiceUnavailable, "Maintenance")
		return
	}

	user := h.auth.GetUser(r.Context())
	if user == nil {
		writeUploadError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if user.Banned {
		writeUploadError(w, http.StatusForbidden, "Banned")
		return
	}
	if !h.limiter.getLimiter(user.ID).Allow() {
		writeUploadError(w, http.StatusTooManyRequests, "Too Many Requests")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestSize)
	file, header, err := r.FormFile("file")
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeUploadError(w, http.StatusRequestEntityTooLarge, "File Too Large")
			return
		}
		writeUploadError(w, http.StatusBadRequest, "Missing File")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxUploadFileSize+1))
	if err != nil {
		writeUploadError(w, http.StatusBadRequest, "Invalid File")
		return
	}
	if len(data) > maxUploadFileSize {
		writeUploadError(w, http.StatusRequestEntityTooLarge, "File Too Large")
		return
	}
	if len(data) == 0 {
		writeUploadError(w, http.StatusBadRequest, "Empty File")
		return
	}

	// The gateway serves files from a zenao.io subdomain: refuse HTML so that
	// it cannot host phishing pages. Skip a UTF-8 byte order mark first: the
	// gateway's type detection skips it too.
	if strings.HasPrefix(http.DetectContentType(bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))), "text/html") {
		writeUploadError(w, http.StatusUnsupportedMediaType, "Unsupported File Type")
		return
	}

	size := int64(len(data))
	if !h.quota.reserve(user.ID, size) {
		writeUploadError(w, http.StatusTooManyRequests, "Daily Upload Quota Exceeded")
		return
	}
	if !h.totalQuota.reserve(totalQuotaKey, size) {
		// Nothing reached the store yet: give the user's bytes back.
		h.quota.release(user.ID, size)
		h.logger.Error("upload-file: daily upload capacity reached", zap.String("user-id", user.ID))
		writeUploadError(w, http.StatusServiceUnavailable, "Daily Upload Capacity Reached")
		return
	}

	// A failed add keeps its bytes in the quotas once the file was sent: kubo
	// can keep the blocks, and sometimes the pin, of an add whose client went
	// away. Only a failure before sending gives them back.
	cid, err := h.store.Add(r.Context(), header.Filename, data)
	if err != nil {
		if errors.Is(err, errNothingStored) {
			h.quota.release(user.ID, size)
			h.totalQuota.release(totalQuotaKey, size)
		}
		if errors.Is(err, ErrStorageFull) {
			h.logger.Error("upload-file: storage full", zap.String("user-id", user.ID))
			writeUploadError(w, http.StatusInsufficientStorage, "Storage Full")
			return
		}
		h.logger.Error("upload-file", zap.String("user-id", user.ID), zap.Error(err))
		writeUploadError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	h.logger.Info("upload-file", zap.String("user-id", user.ID), zap.String("cid", cid), zap.Int("size", len(data)))
	writeUploadJSON(w, http.StatusOK, map[string]string{"uri": "ipfs://" + cid})
}

func writeUploadError(w http.ResponseWriter, status int, msg string) {
	writeUploadJSON(w, status, map[string]string{"error": msg})
}

func writeUploadJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// uploadQuota limits the bytes each user can upload in a fixed window that
// starts at the user's first upload. It is kept in memory.
type uploadQuota struct {
	mu     sync.Mutex
	limit  int64
	window time.Duration
	usage  map[string]*quotaUsage
	now    func() time.Time
}

type quotaUsage struct {
	start time.Time
	bytes int64
}

func newUploadQuota(limit int64, window time.Duration) *uploadQuota {
	return &uploadQuota{limit: limit, window: window, usage: map[string]*quotaUsage{}, now: time.Now}
}

// reserve records n bytes for userID and reports whether they fit in the quota.
func (q *uploadQuota) reserve(userID string, n int64) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	now := q.now()
	if len(q.usage) > 10000 {
		for id, u := range q.usage {
			if now.Sub(u.start) >= q.window {
				delete(q.usage, id)
			}
		}
	}

	u := q.usage[userID]
	if u == nil || now.Sub(u.start) >= q.window {
		u = &quotaUsage{start: now}
		q.usage[userID] = u
	}
	if u.bytes+n > q.limit {
		return false
	}
	u.bytes += n
	return true
}

// release gives back n bytes reserved for userID, when nothing was stored.
func (q *uploadQuota) release(userID string, n int64) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if u := q.usage[userID]; u != nil {
		u.bytes = max(0, u.bytes-n)
	}
}
