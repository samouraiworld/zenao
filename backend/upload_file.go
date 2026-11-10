package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
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
}

var _ http.Handler = (*uploadFileHandler)(nil)

func newUploadFileHandler(logger *zap.Logger, auth zeni.Auth, store FileStore, maintenance bool) *uploadFileHandler {
	return &uploadFileHandler{
		logger:      logger,
		auth:        auth,
		store:       store,
		maintenance: maintenance,
		// Per-user limit: one upload every 2 seconds on average, bursts of 10.
		limiter: NewRateLimiter(0.5, 10, 10*time.Minute),
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
	// it cannot host phishing pages.
	if strings.HasPrefix(http.DetectContentType(data), "text/html") {
		writeUploadError(w, http.StatusUnsupportedMediaType, "Unsupported File Type")
		return
	}

	cid, err := h.store.Add(r.Context(), header.Filename, data)
	if err != nil {
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
