package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func uploadRequest(t *testing.T, field string, data []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile(field, "file.png")
	require.NoError(t, err)
	_, err = part.Write(data)
	require.NoError(t, err)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, uploadFilePath, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func serveUpload(h http.Handler, req *http.Request) (int, map[string]string) {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var body map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	return rec.Code, body
}

var pngHeader = []byte("\x89PNG\r\n\x1a\nrest of the image")

func TestUploadFile(t *testing.T) {
	store := &fakeFileStore{result: func(string, []byte) (string, error) { return "bafkreitest", nil }}
	h := newUploadFileHandler(zap.NewNop(), &stubAuth{user: &zeni.AuthUser{ID: "user-1"}}, store, false)

	code, body := serveUpload(h, uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusOK, code)
	require.Equal(t, map[string]string{"uri": "ipfs://bafkreitest"}, body)
	require.Equal(t, pngHeader, store.added["file.png"])
}

func TestUploadFileRejections(t *testing.T) {
	okStore := &fakeFileStore{result: func(string, []byte) (string, error) { return "bafkreitest", nil }}
	user := &zeni.AuthUser{ID: "user-1"}

	tests := []struct {
		name        string
		user        *zeni.AuthUser
		store       FileStore
		maintenance bool
		req         func(t *testing.T) *http.Request
		wantCode    int
	}{
		{
			name:     "anonymous",
			req:      func(t *testing.T) *http.Request { return uploadRequest(t, "file", pngHeader) },
			wantCode: http.StatusUnauthorized,
		},
		{
			name:     "banned",
			user:     &zeni.AuthUser{ID: "user-2", Banned: true},
			req:      func(t *testing.T) *http.Request { return uploadRequest(t, "file", pngHeader) },
			wantCode: http.StatusForbidden,
		},
		{
			name:     "wrong method",
			user:     user,
			req:      func(t *testing.T) *http.Request { return httptest.NewRequest(http.MethodGet, uploadFilePath, nil) },
			wantCode: http.StatusMethodNotAllowed,
		},
		{
			name:        "maintenance",
			user:        user,
			maintenance: true,
			req:         func(t *testing.T) *http.Request { return uploadRequest(t, "file", pngHeader) },
			wantCode:    http.StatusServiceUnavailable,
		},
		{
			name:     "missing file field",
			user:     user,
			req:      func(t *testing.T) *http.Request { return uploadRequest(t, "other", pngHeader) },
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "empty file",
			user:     user,
			req:      func(t *testing.T) *http.Request { return uploadRequest(t, "file", nil) },
			wantCode: http.StatusBadRequest,
		},
		{
			name: "file too large",
			user: user,
			req: func(t *testing.T) *http.Request {
				return uploadRequest(t, "file", append(pngHeader, make([]byte, maxUploadFileSize)...))
			},
			wantCode: http.StatusRequestEntityTooLarge,
		},
		{
			name: "request body over the request limit",
			user: user,
			req: func(t *testing.T) *http.Request {
				return uploadRequest(t, "file", append(pngHeader, make([]byte, maxUploadRequestSize)...))
			},
			wantCode: http.StatusRequestEntityTooLarge,
		},
		{
			name: "html file",
			user: user,
			req: func(t *testing.T) *http.Request {
				return uploadRequest(t, "file", []byte("<!DOCTYPE html><html><body>login</body></html>"))
			},
			wantCode: http.StatusUnsupportedMediaType,
		},
		{
			name: "html file behind a UTF-8 byte order mark",
			user: user,
			req: func(t *testing.T) *http.Request {
				return uploadRequest(t, "file", []byte("\xef\xbb\xbf<!DOCTYPE html><html><body>login</body></html>"))
			},
			wantCode: http.StatusUnsupportedMediaType,
		},
		{
			name:     "storage full",
			user:     user,
			store:    &fakeFileStore{result: func(string, []byte) (string, error) { return "", ErrStorageFull }},
			req:      func(t *testing.T) *http.Request { return uploadRequest(t, "file", pngHeader) },
			wantCode: http.StatusInsufficientStorage,
		},
		{
			name:     "store error",
			user:     user,
			store:    &fakeFileStore{result: func(string, []byte) (string, error) { return "", errors.New("kubo down") }},
			req:      func(t *testing.T) *http.Request { return uploadRequest(t, "file", pngHeader) },
			wantCode: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := tt.store
			if store == nil {
				store = okStore
			}
			h := newUploadFileHandler(zap.NewNop(), &stubAuth{user: tt.user}, store, tt.maintenance)
			code, body := serveUpload(h, tt.req(t))
			require.Equal(t, tt.wantCode, code)
			require.NotEmpty(t, body["error"])
			require.Empty(t, body["uri"])
		})
	}
}

func TestUploadFileRateLimit(t *testing.T) {
	store := &fakeFileStore{result: func(string, []byte) (string, error) { return "bafkreitest", nil }}
	h := newUploadFileHandler(zap.NewNop(), &stubAuth{user: &zeni.AuthUser{ID: "user-1"}}, store, false)

	codes := map[int]int{}
	for range 15 {
		code, _ := serveUpload(h, uploadRequest(t, "file", pngHeader))
		codes[code]++
	}
	require.Equal(t, 10, codes[http.StatusOK])
	require.Equal(t, 5, codes[http.StatusTooManyRequests])
}

func TestUploadFileDailyQuota(t *testing.T) {
	var addErr error
	store := &fakeFileStore{result: func(string, []byte) (string, error) {
		if addErr != nil {
			return "", addErr
		}
		return "bafkreitest", nil
	}}
	h := newUploadFileHandler(zap.NewNop(), &stubAuth{user: &zeni.AuthUser{ID: "user-1"}}, store, false)
	now := time.Unix(0, 0)
	h.quota = newUploadQuota(int64(3*len(pngHeader)), time.Hour)
	h.quota.now = func() time.Time { return now }

	// A failure before the file reached the store gives the quotas back.
	addErr = nothingStored(errors.New("kubo down"))
	code, _ := serveUpload(h, uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusInternalServerError, code)
	require.Zero(t, h.quota.usage["user-1"].bytes)
	require.Zero(t, h.totalQuota.usage[totalQuotaKey].bytes)

	// A failure after sending keeps them: kubo can keep what it received.
	addErr = errors.New("kubo add: unexpected EOF")
	code, _ = serveUpload(h, uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusInternalServerError, code)

	addErr = nil
	for range 2 {
		code, _ = serveUpload(h, uploadRequest(t, "file", pngHeader))
		require.Equal(t, http.StatusOK, code)
	}
	code, body := serveUpload(h, uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusTooManyRequests, code)
	require.Equal(t, "Daily Upload Quota Exceeded", body["error"])

	// Another user has its own quota; the window resets after its duration.
	other := newUploadFileHandler(zap.NewNop(), &stubAuth{user: &zeni.AuthUser{ID: "user-2"}}, store, false)
	other.quota = h.quota
	code, _ = serveUpload(other, uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusOK, code)

	now = now.Add(time.Hour)
	code, _ = serveUpload(h, uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusOK, code)
}

func TestUploadFileDailyTotalQuota(t *testing.T) {
	store := &fakeFileStore{result: func(string, []byte) (string, error) { return "bafkreitest", nil }}
	quota := newUploadQuota(int64(10*len(pngHeader)), time.Hour)
	totalQuota := newUploadQuota(int64(2*len(pngHeader)), time.Hour)
	handler := func(userID string) *uploadFileHandler {
		h := newUploadFileHandler(zap.NewNop(), &stubAuth{user: &zeni.AuthUser{ID: userID}}, store, false)
		h.quota, h.totalQuota = quota, totalQuota
		return h
	}

	for _, id := range []string{"user-1", "user-2"} {
		code, _ := serveUpload(handler(id), uploadRequest(t, "file", pngHeader))
		require.Equal(t, http.StatusOK, code)
	}

	// All users together reached the daily total: a third user is refused
	// and keeps its own quota, since nothing was stored.
	code, body := serveUpload(handler("user-3"), uploadRequest(t, "file", pngHeader))
	require.Equal(t, http.StatusServiceUnavailable, code)
	require.Equal(t, "Daily Upload Capacity Reached", body["error"])
	require.Zero(t, quota.usage["user-3"].bytes)
}
