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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// Valid CIDs used by the tests (default mail icons).
const (
	testCIDA = "bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"
	testCIDB = "bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"
	testCIDC = "bafkreifqabflxtsqvaggg2kw4lyju3pckq4osun4vdlltsn7lal7ak5hli"
	testCIDD = "bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy"
)

// readMultipartFile is called from httptest handlers: it uses assert, not
// require, because require must not stop the test from another goroutine.
func readMultipartFile(t *testing.T, r *http.Request) (string, []byte) {
	t.Helper()
	file, header, err := r.FormFile("file")
	if !assert.NoError(t, err) {
		return "", nil
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	assert.NoError(t, err)
	return header.Filename, data
}

func writeRepoStat(w http.ResponseWriter, repoSize, storageMax uint64) {
	_ = json.NewEncoder(w).Encode(map[string]uint64{"RepoSize": repoSize, "StorageMax": storageMax})
}

func TestKuboFileStoreAdd(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		switch r.URL.Path {
		case "/api/v0/repo/stat":
			writeRepoStat(w, 1000, 1<<30)
		case "/api/v0/add":
			for key, values := range kuboAddParams {
				assert.Equal(t, values, r.URL.Query()[key], key)
			}
			name, data := readMultipartFile(t, r)
			assert.Equal(t, "file", name, "user file names never reach kubo")
			assert.Equal(t, []byte("image bytes"), data)
			_, _ = w.Write([]byte(`{"Name":"file","Hash":"bafkreitest","Size":"11"}`))
		default:
			t.Errorf("unexpected path %s", r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	store, err := newFileStore(fileStoreKubo, srv.URL+"/", "", "")
	require.NoError(t, err)

	cid, err := store.Add(context.Background(), "cat.png", []byte("image bytes"))
	require.NoError(t, err)
	require.Equal(t, "bafkreitest", cid)
}

func TestKuboFileStoreAddErrors(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
		wantErr string
		isFull  bool
	}{
		{
			name: "add status 500",
			handler: func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/v0/repo/stat" {
					writeRepoStat(w, 0, 1<<30)
					return
				}
				http.Error(w, "boom", http.StatusInternalServerError)
			},
			wantErr: "status 500",
		},
		{
			name: "late error in trailer",
			handler: func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/v0/repo/stat" {
					writeRepoStat(w, 0, 1<<30)
					return
				}
				w.Header().Set("Trailer", "X-Stream-Error")
				_, _ = w.Write([]byte(`{"Name":"cat.png","Hash":"bafkreitest","Size":"11"}`))
				w.Header().Set("X-Stream-Error", "pin failed")
			},
			wantErr: "pin failed",
		},
		{
			name: "storage full",
			handler: func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/v0/repo/stat" {
					writeRepoStat(w, 1000, 1005)
					return
				}
				t.Errorf("add must not be called when storage is full")
			},
			isFull: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := httptest.NewServer(tt.handler)
			defer srv.Close()

			store, err := newFileStore(fileStoreKubo, srv.URL, "", "")
			require.NoError(t, err)

			_, err = store.Add(context.Background(), "cat.png", []byte("image bytes"))
			require.Error(t, err)
			if tt.isFull {
				require.ErrorIs(t, err, ErrStorageFull)
			} else {
				require.ErrorContains(t, err, tt.wantErr)
			}
		})
	}
}

func TestPinataFileStoreAdd(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/pinning/pinFileToIPFS", r.URL.Path)
		assert.Equal(t, "Bearer jwt-token", r.Header.Get("Authorization"))

		name, data := readMultipartFile(t, r)
		assert.Equal(t, "file", name)
		assert.Equal(t, []byte("image bytes"), data)
		assert.JSONEq(t, `{"name":"a/b.png"}`, r.FormValue("pinataMetadata"))

		var options map[string]any
		assert.NoError(t, json.Unmarshal([]byte(r.FormValue("pinataOptions")), &options))
		assert.Equal(t, map[string]any{"cidVersion": float64(1), "groupId": "group-id"}, options)

		_, _ = w.Write([]byte(`{"IpfsHash":"bafkreitest","PinSize":11}`))
	}))
	defer srv.Close()

	store := &pinataFileStore{apiURL: srv.URL, jwt: "jwt-token", group: "group-id", client: srv.Client()}
	cid, err := store.Add(context.Background(), "a/b.png", []byte("image bytes"))
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
		assert.Equal(t, "/api/v0/cat", r.URL.Path)
		assert.Equal(t, "true", r.URL.Query().Get("offline"), "cat must not wait for the network")
		switch cid := r.URL.Query().Get("arg"); cid {
		case testCIDA, testCIDB, testCIDC:
			_, _ = w.Write([]byte("content of " + cid))
		case testCIDD:
			http.Error(w, `{"Message":"block was not found locally (offline): ipld: could not find `+cid+`"}`, http.StatusInternalServerError)
		default:
			t.Errorf("unexpected cat arg %q", cid)
			http.Error(w, "unexpected", http.StatusBadRequest)
		}
	}))
	defer kubo.Close()
	src := &kuboFileStore{apiURL: kubo.URL, client: kubo.Client()}

	dst := &fakeFileStore{result: func(name string, _ []byte) (string, error) {
		switch name {
		case testCIDB:
			return "other-cid", nil
		case testCIDC:
			return "", errors.New("pinata down")
		default:
			return name, nil
		}
	}}

	// testCIDD is lost, "/ipns/example.com" is not a CID and must never reach kubo.
	cids := []string{testCIDA, testCIDB, testCIDC, testCIDD, "/ipns/example.com"}
	res := copyFiles(context.Background(), zap.NewNop(), cids, src, dst)
	require.Equal(t, copyFilesResult{copied: 1, missing: 1, failed: 3}, res)
	require.Equal(t, []byte("content of "+testCIDA), dst.added[testCIDA])
	require.NotContains(t, dst.added, testCIDD)

	// Dry run: no destination, only checks presence on the kubo node.
	res = copyFiles(context.Background(), zap.NewNop(), cids, src, nil)
	require.Equal(t, copyFilesResult{missing: 1, failed: 1}, res)
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

	// The copy command reads the same file back from the node, and reports a
	// CID the node does not hold as missing, without waiting for the network.
	lost := "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy"
	res := copyFiles(context.Background(), zap.NewNop(), []string{cid, lost}, store.(*kuboFileStore), nil)
	require.Equal(t, copyFilesResult{missing: 1}, res)
}

func TestExtractIPFSCIDs(t *testing.T) {
	text := "Intro ![cover](ipfs://" + testCIDA + ") and [audio](ipfs://" + testCIDB + ")\n" +
		`{"uri":"ipfs://` + testCIDC + `"}` + " ipfs://hello ipfs://" + testCIDD + "\\n"
	require.Equal(t, []string{testCIDA, testCIDB, testCIDC, testCIDD}, extractIPFSCIDs(text))
}
