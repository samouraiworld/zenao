package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// ErrStorageFull is returned by FileStore.Add when the store has no room left.
var ErrStorageFull = errors.New("file storage is full")

// FileStore adds a file to IPFS, pins it and returns its CID.
//
// Every implementation must produce the same CID for the same bytes (CIDv1,
// raw leaves, 256 KiB chunks, sha2-256), so that the ipfs://<cid> URIs stored
// in the database stay valid when switching from one store to the other.
type FileStore interface {
	Add(ctx context.Context, name string, data []byte) (string, error)
}

const (
	fileStoreKubo   = "kubo"
	fileStorePinata = "pinata"

	// defaultIPFSAPIURL is the kubo RPC API of dev.docker-compose.yml.
	defaultIPFSAPIURL = "http://127.0.0.1:5001"

	// defaultPinataAPIURL is the Pinata pinning API used by the former
	// pinata-web3 SDK; it produces the same CIDs as kuboAddParams.
	defaultPinataAPIURL = "https://api.pinata.cloud"
)

// kuboAddParams are the /api/v0/add parameters. They match the parameters
// Pinata used for Zenao uploads (cidVersion 1), so both stores yield identical
// CIDs. They are explicit so that a change of kubo defaults cannot alter CIDs.
var kuboAddParams = url.Values{
	"cid-version": {"1"},
	"raw-leaves":  {"true"},
	"chunker":     {"size-262144"},
	"hash":        {"sha2-256"},
	"pin":         {"true"},
}

func newFileStoreHTTPClient() *http.Client {
	return &http.Client{
		Timeout:   2 * time.Minute,
		Transport: otelhttp.NewTransport(http.DefaultTransport),
	}
}

// newFileStore returns the FileStore selected by kind.
func newFileStore(kind, kuboAPIURL, pinataJWT, pinataGroup string) (FileStore, error) {
	switch kind {
	case fileStoreKubo:
		if kuboAPIURL == "" {
			return nil, errors.New("kubo file store needs an IPFS API URL")
		}
		return newKuboFileStore(kuboAPIURL, newFileStoreHTTPClient()), nil
	case fileStorePinata:
		if pinataJWT == "" {
			return nil, errors.New("pinata file store needs a Pinata JWT")
		}
		return &pinataFileStore{apiURL: defaultPinataAPIURL, jwt: pinataJWT, group: pinataGroup, client: newFileStoreHTTPClient()}, nil
	default:
		return nil, fmt.Errorf("unknown file store %q, expected %q or %q", kind, fileStoreKubo, fileStorePinata)
	}
}

// kuboFileStore adds files through the RPC API of a kubo node. The RPC API
// gives full control of the node: it must only be reachable from the backend.
type kuboFileStore struct {
	apiURL string
	client *http.Client

	// addSlot makes the free-space check and the add one step, so that
	// concurrent uploads cannot all pass the check and overshoot StorageMax.
	// A channel, unlike a mutex, lets a cancelled request stop waiting.
	addSlot chan struct{}
}

func newKuboFileStore(apiURL string, client *http.Client) *kuboFileStore {
	return &kuboFileStore{apiURL: strings.TrimSuffix(apiURL, "/"), client: client, addSlot: make(chan struct{}, 1)}
}

var _ FileStore = (*kuboFileStore)(nil)

func (k *kuboFileStore) Add(ctx context.Context, name string, data []byte) (string, error) {
	select {
	case k.addSlot <- struct{}{}:
	case <-ctx.Done():
		return "", ctx.Err()
	}
	defer func() { <-k.addSlot }()

	if err := k.checkSpace(ctx, len(data)); err != nil {
		return "", err
	}

	body, contentType, err := multipartFile(data, nil)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.apiURL+"/api/v0/add?"+kuboAddParams.Encode(), body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", contentType)

	resp, err := k.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("kubo add: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		if strings.Contains(string(msg), "no space left on device") {
			return "", ErrStorageFull
		}
		return "", fmt.Errorf("kubo add: status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}

	// kubo streams the result and reports late errors (for example a failed
	// pin) in the X-Stream-Error trailer, available once the body is read.
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("kubo add: read response: %w", err)
	}
	if streamErr := resp.Trailer.Get("X-Stream-Error"); streamErr != "" {
		if strings.Contains(streamErr, "no space left on device") {
			return "", ErrStorageFull
		}
		return "", fmt.Errorf("kubo add: %s", streamErr)
	}

	// One JSON object per added entry; the last one is the root.
	var hash string
	dec := json.NewDecoder(bytes.NewReader(raw))
	for dec.More() {
		var res struct {
			Hash string `json:"Hash"`
		}
		if err := dec.Decode(&res); err != nil {
			return "", fmt.Errorf("kubo add: decode response: %w", err)
		}
		hash = res.Hash
	}
	if hash == "" {
		return "", errors.New("kubo add: empty CID in response")
	}
	return hash, nil
}

// checkSpace returns ErrStorageFull when adding size bytes would exceed the
// Datastore.StorageMax of the node.
func (k *kuboFileStore) checkSpace(ctx context.Context, size int) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.apiURL+"/api/v0/repo/stat?size-only=true", nil)
	if err != nil {
		return err
	}
	resp, err := k.client.Do(req)
	if err != nil {
		return fmt.Errorf("kubo repo stat: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("kubo repo stat: status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}

	var stat struct {
		RepoSize   uint64 `json:"RepoSize"`
		StorageMax uint64 `json:"StorageMax"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&stat); err != nil {
		return fmt.Errorf("kubo repo stat: decode response: %w", err)
	}
	if stat.StorageMax > 0 && stat.RepoSize+uint64(size) > stat.StorageMax {
		return ErrStorageFull
	}
	return nil
}

// errNotOnNode is returned by Cat when the node does not hold the file.
var errNotOnNode = errors.New("not on the kubo node")

// Cat returns the content of a file stored on the kubo node. It only reads
// local blocks: it never waits for the network.
func (k *kuboFileStore) Cat(ctx context.Context, c string) ([]byte, error) {
	parsed, err := cid.Decode(c)
	if err != nil {
		return nil, fmt.Errorf("invalid CID %q: %w", c, err)
	}

	query := url.Values{"arg": {parsed.String()}, "offline": {"true"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.apiURL+"/api/v0/cat?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := k.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("kubo cat: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		if strings.Contains(string(msg), "not found locally") {
			return nil, errNotOnNode
		}
		return nil, fmt.Errorf("kubo cat: status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("kubo cat: read response: %w", err)
	}
	if streamErr := resp.Trailer.Get("X-Stream-Error"); streamErr != "" {
		return nil, fmt.Errorf("kubo cat: %s", streamErr)
	}
	return data, nil
}

// pinataFileStore adds files to Pinata. It is kept so that Zenao can move
// back to Pinata with a configuration change only.
type pinataFileStore struct {
	apiURL string
	jwt    string
	group  string
	client *http.Client
}

var _ FileStore = (*pinataFileStore)(nil)

func (p *pinataFileStore) Add(ctx context.Context, name string, data []byte) (string, error) {
	options := map[string]any{"cidVersion": 1}
	if p.group != "" {
		options["groupId"] = p.group
	}
	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return "", err
	}
	metadataJSON, err := json.Marshal(map[string]string{"name": name})
	if err != nil {
		return "", err
	}

	body, contentType, err := multipartFile(data, map[string]string{
		"pinataOptions":  string(optionsJSON),
		"pinataMetadata": string(metadataJSON),
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.apiURL+"/pinning/pinFileToIPFS", body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", "Bearer "+p.jwt)

	resp, err := p.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("pinata upload: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("pinata upload: status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}

	var res struct {
		IpfsHash string `json:"IpfsHash"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", fmt.Errorf("pinata upload: decode response: %w", err)
	}
	if res.IpfsHash == "" {
		return "", errors.New("pinata upload: empty CID in response")
	}
	return res.IpfsHash, nil
}

// multipartFile builds a multipart body with the file in the "file" field,
// followed by the given extra fields. The multipart file name is fixed: the
// stores read paths from it (a "/" would create a directory), and the name
// does not change the CID of a single file.
func multipartFile(data []byte, fields map[string]string) (io.Reader, string, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	part, err := w.CreateFormFile("file", "file")
	if err != nil {
		return nil, "", err
	}
	if _, err := part.Write(data); err != nil {
		return nil, "", err
	}
	for key, value := range fields {
		if err := w.WriteField(key, value); err != nil {
			return nil, "", err
		}
	}
	if err := w.Close(); err != nil {
		return nil, "", err
	}
	return &buf, w.FormDataContentType(), nil
}
