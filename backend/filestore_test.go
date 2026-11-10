package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func readMultipartFile(t *testing.T, r *http.Request) (string, []byte) {
	t.Helper()
	file, header, err := r.FormFile("file")
	require.NoError(t, err)
	defer file.Close()
	data, err := io.ReadAll(file)
	require.NoError(t, err)
	return header.Filename, data
}

func TestKuboFileStoreAdd(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "/api/v0/add", r.URL.Path)
		for key, values := range kuboAddParams {
			require.Equal(t, values, r.URL.Query()[key], key)
		}
		name, data := readMultipartFile(t, r)
		require.Equal(t, "cat.png", name)
		require.Equal(t, []byte("image bytes"), data)
		_, _ = w.Write([]byte(`{"Name":"cat.png","Hash":"bafkreitest","Size":"11"}`))
	}))
	defer srv.Close()

	store, err := newFileStore(fileStoreKubo, srv.URL+"/", "", "")
	require.NoError(t, err)

	cid, err := store.Add(context.Background(), "cat.png", []byte("image bytes"))
	require.NoError(t, err)
	require.Equal(t, "bafkreitest", cid)
}

func TestKuboFileStoreAddError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()

	store, err := newFileStore(fileStoreKubo, srv.URL, "", "")
	require.NoError(t, err)

	_, err = store.Add(context.Background(), "cat.png", []byte("image bytes"))
	require.ErrorContains(t, err, "status 500")
}

func TestPinataFileStoreAdd(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "/pinning/pinFileToIPFS", r.URL.Path)
		require.Equal(t, "Bearer jwt-token", r.Header.Get("Authorization"))

		name, data := readMultipartFile(t, r)
		require.Equal(t, "cat.png", name)
		require.Equal(t, []byte("image bytes"), data)

		var options map[string]any
		require.NoError(t, json.Unmarshal([]byte(r.FormValue("pinataOptions")), &options))
		require.Equal(t, map[string]any{"cidVersion": float64(1), "groupId": "group-id"}, options)

		_, _ = w.Write([]byte(`{"IpfsHash":"bafkreitest","PinSize":11}`))
	}))
	defer srv.Close()

	store := &pinataFileStore{apiURL: srv.URL, jwt: "jwt-token", group: "group-id", client: srv.Client()}
	cid, err := store.Add(context.Background(), "cat.png", []byte("image bytes"))
	require.NoError(t, err)
	require.Equal(t, "bafkreitest", cid)
}

func TestNewFileStoreErrors(t *testing.T) {
	_, err := newFileStore("s3", "http://127.0.0.1:5001", "", "")
	require.ErrorContains(t, err, "unknown file store")

	_, err = newFileStore(fileStorePinata, "", "", "")
	require.ErrorContains(t, err, "Pinata JWT")

	_, err = newFileStore(fileStoreKubo, "", "", "")
	require.ErrorContains(t, err, "IPFS API URL")

	store, err := newFileStore(fileStorePinata, "", "jwt", "")
	require.NoError(t, err)
	require.IsType(t, &pinataFileStore{}, store)
}

type fakeFileStore struct {
	result func(name string, data []byte) (string, error)
	added  map[string][]byte
}

func (f *fakeFileStore) Add(_ context.Context, name string, data []byte) (string, error) {
	if f.added == nil {
		f.added = map[string][]byte{}
	}
	f.added[name] = data
	return f.result(name, data)
}

func TestCopyFiles(t *testing.T) {
	kubo := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/api/v0/cat", r.URL.Path)
		switch cid := r.URL.Query().Get("arg"); cid {
		case "cid-ok", "cid-mismatch", "cid-error":
			_, _ = w.Write([]byte("content of " + cid))
		default:
			http.Error(w, `{"Message":"block was not found locally (offline)"}`, http.StatusInternalServerError)
		}
	}))
	defer kubo.Close()
	src := &kuboFileStore{apiURL: kubo.URL, client: kubo.Client()}

	dst := &fakeFileStore{result: func(name string, _ []byte) (string, error) {
		switch name {
		case "cid-mismatch":
			return "other-cid", nil
		case "cid-error":
			return "", errors.New("pinata down")
		default:
			return name, nil
		}
	}}

	cids := []string{"cid-ok", "cid-mismatch", "cid-error", "cid-lost"}
	res := copyFiles(context.Background(), zap.NewNop(), cids, src, dst)
	require.Equal(t, copyFilesResult{copied: 1, missing: 1, failed: 2}, res)
	require.Equal(t, []byte("content of cid-ok"), dst.added["cid-ok"])
	require.NotContains(t, dst.added, "cid-lost")

	// Dry run: no destination, only checks presence on the kubo node.
	res = copyFiles(context.Background(), zap.NewNop(), cids, src, nil)
	require.Equal(t, copyFilesResult{missing: 1}, res)
}

// TestKuboFileStoreIntegration runs against a real kubo node, for example the
// one from dev.docker-compose.yml:
//
//	ZENAO_TEST_KUBO_API_URL=http://127.0.0.1:5001 ZENAO_TEST_KUBO_GATEWAY_URL=http://127.0.0.1:8080 go test ./backend -run TestKuboFileStoreIntegration
func TestKuboFileStoreIntegration(t *testing.T) {
	apiURL := os.Getenv("ZENAO_TEST_KUBO_API_URL")
	gatewayURL := os.Getenv("ZENAO_TEST_KUBO_GATEWAY_URL")
	if apiURL == "" || gatewayURL == "" {
		t.Skip("ZENAO_TEST_KUBO_API_URL and ZENAO_TEST_KUBO_GATEWAY_URL not set")
	}

	store, err := newFileStore(fileStoreKubo, apiURL, "", "")
	require.NoError(t, err)
	h := newUploadFileHandler(zap.NewNop(), &stubAuth{user: &zeni.AuthUser{ID: "user-1"}}, store, false)

	data := append([]byte{}, pngHeader...)
	data = append(data, []byte(t.Name())...)
	code, body := serveUpload(h, uploadRequest(t, "file", data))
	require.Equal(t, http.StatusOK, code)
	require.True(t, strings.HasPrefix(body["uri"], "ipfs://bafkrei"), body["uri"])
	cid := strings.TrimPrefix(body["uri"], "ipfs://")

	resp, err := http.Get(gatewayURL + "/ipfs/" + cid)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)
	got, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Equal(t, data, got)

	// The copy command reads the same file back from the node.
	res := copyFiles(context.Background(), zap.NewNop(), []string{cid}, store.(*kuboFileStore), nil)
	require.Equal(t, copyFilesResult{}, res)
}
