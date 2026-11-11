package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestIsPublicImageAddr(t *testing.T) {
	blocked := []string{
		"127.0.0.1", "127.1.2.3", "0.0.0.0", "0.1.2.3",
		"10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1",
		"169.254.169.254", "169.254.0.1", "100.64.0.1", "100.127.255.255",
		"192.0.0.1", "198.18.0.1", "224.0.0.1", "239.255.255.250",
		"240.0.0.1", "255.255.255.255",
		"::", "::1", "fe80::1", "fc00::1", "fd12:3456::1", "fec0::1", "ff02::1",
		"::ffff:127.0.0.1", "::ffff:169.254.169.254", "::ffff:10.0.0.1", "::ffff:0.0.0.0",
		"::127.0.0.1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::1", "2001::1", "2001:db8::1",
	}
	for _, s := range blocked {
		require.False(t, isPublicImageAddr(netip.MustParseAddr(s)), s)
	}

	allowed := []string{"8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111", "::ffff:8.8.8.8"}
	for _, s := range allowed {
		require.True(t, isPublicImageAddr(netip.MustParseAddr(s)), s)
	}
}

func TestImageFetchBlockedURLs(t *testing.T) {
	f := newImageFetcher(mustImageFetchPolicy(t, "https://gateway.example"))

	for _, rawURL := range []string{
		// loopback, by address and by a name that resolves to it
		"http://127.0.0.1/a.png",
		"http://localhost/a.png",
		"http://[::1]/a.png",
		"http://[::ffff:127.0.0.1]/a.png",
		"http://[::ffff:7f00:1]/a.png",
		// cloud metadata and other link-local addresses
		"http://169.254.169.254/latest/meta-data/",
		"http://[fe80::1]/a.png",
		// private ranges
		"http://10.0.0.1/a.png",
		"http://172.16.0.1/a.png",
		"https://192.168.1.1/a.png",
		"http://[fd00::1]/a.png",
		"http://[::ffff:10.0.0.1]/a.png",
		// unspecified
		"http://0.0.0.0/a.png",
		"http://[::]/a.png",
		// schemes other than http and https
		"file:///etc/passwd",
		"ftp://example.com/a.png",
		"gopher://example.com/a.png",
		"ipfs://bafkreifqabflxtsqvaggg2kw4lyju3pckq4osun4vdlltsn7lal7ak5hli",
		"/relative/a.png",
		// ports other than 80 and 443 on untrusted hosts
		"http://example.com:8080/a.png",
		"https://example.com:5001/api/v0/id",
		// gateway host outside /ipfs/
		"https://gateway.example/api/v0/id",
		"https://gateway.example/ipfs/../api/v0/id",
		"https://gateway.example/ipfs/%2e%2e/api/v0/id",
		"https://gateway.example/ipns/example.com",
	} {
		_, err := f.fetch(context.Background(), rawURL)
		require.ErrorIs(t, err, errImageURLBlocked, rawURL)
	}
}

func TestImageFetchTrustedGateway(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/ipfs/bafy/a.png", r.URL.Path)
		_, _ = w.Write([]byte("image-bytes"))
	}))
	defer srv.Close()

	// The gateway listens on a loopback address, which is blocked for any
	// other host: the trusted gateway must still be reachable.
	f := newImageFetcher(mustImageFetchPolicy(t, srv.URL))
	data, err := f.fetch(context.Background(), srv.URL+"/ipfs/bafy/a.png?img-width=1280")
	require.NoError(t, err)
	require.Equal(t, "image-bytes", string(data))
}

func TestImageFetchAllowedUntrustedHost(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("image-bytes"))
	}))
	defer srv.Close()

	// Test policy: the httptest server stands in for a public host.
	policy := mustImageFetchPolicy(t, "https://gateway.example")
	policy.allowAnyPort = true
	policy.allowAddr = func(netip.Addr) bool { return true }
	f := newImageFetcher(policy)

	data, err := f.fetch(context.Background(), srv.URL+"/a.png")
	require.NoError(t, err)
	require.Equal(t, "image-bytes", string(data))
}

func TestImageFetchRedirects(t *testing.T) {
	blockedTarget := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("blocked redirect target was reached")
	}))
	defer blockedTarget.Close()

	var gatewayURL string
	gateway := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ipfs/to-loopback":
			http.Redirect(w, r, blockedTarget.URL+"/a.png", http.StatusFound)
		case "/ipfs/to-metadata":
			http.Redirect(w, r, "http://169.254.169.254/latest/meta-data/", http.StatusFound)
		case "/ipfs/to-file":
			http.Redirect(w, r, "file:///etc/passwd", http.StatusFound)
		case "/ipfs/to-gateway-api":
			http.Redirect(w, r, gatewayURL+"/api/v0/id", http.StatusFound)
		case "/ipfs/loop":
			http.Redirect(w, r, gatewayURL+"/ipfs/loop", http.StatusFound)
		case "/ipfs/to-image":
			http.Redirect(w, r, gatewayURL+"/ipfs/image", http.StatusFound)
		case "/ipfs/image":
			_, _ = w.Write([]byte("image-bytes"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer gateway.Close()
	gatewayURL = gateway.URL

	// Any port is allowed so that the redirect to the loopback test server
	// is refused by the address check, not by the port check.
	policy := mustImageFetchPolicy(t, gateway.URL)
	policy.allowAnyPort = true
	f := newImageFetcher(policy)

	for _, path := range []string{"/ipfs/to-loopback", "/ipfs/to-metadata", "/ipfs/to-file", "/ipfs/to-gateway-api", "/ipfs/loop"} {
		_, err := f.fetch(context.Background(), gateway.URL+path)
		require.ErrorIs(t, err, errImageURLBlocked, path)
	}

	data, err := f.fetch(context.Background(), gateway.URL+"/ipfs/to-image")
	require.NoError(t, err)
	require.Equal(t, "image-bytes", string(data))
}

func TestImageFetchLimits(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ipfs/big":
			_, _ = w.Write([]byte(strings.Repeat("x", 2048)))
		case "/ipfs/big-streamed":
			w.Header().Set("Transfer-Encoding", "chunked")
			for range 4 {
				_, _ = fmt.Fprint(w, strings.Repeat("x", 512))
				w.(http.Flusher).Flush()
			}
		case "/ipfs/slow":
			time.Sleep(500 * time.Millisecond)
		case "/ipfs/missing":
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	f := newImageFetcher(mustImageFetchPolicy(t, srv.URL))
	f.maxBytes = 1024
	f.client.Timeout = 200 * time.Millisecond

	for _, path := range []string{"/ipfs/big", "/ipfs/big-streamed", "/ipfs/slow", "/ipfs/missing"} {
		_, err := f.fetch(context.Background(), srv.URL+path)
		require.Error(t, err, path)
		require.False(t, errors.Is(err, errImageURLBlocked), path)
	}
}

func mustImageFetchPolicy(t *testing.T, gatewayURL string) imageFetchPolicy {
	t.Helper()
	policy, err := newImageFetchPolicy(gatewayURL)
	require.NoError(t, err)
	return policy
}
