package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
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
		"192.88.99.1", "2001:2::1", "2001:20::1", "3fff::1", "4000::1", "5f00::1", "100::1",
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
		"https://gateway.example/ipfs/%252e%252e/api/v0/id",
		"https://gateway.example/ipfs/..%5C..%5Capi/v0/id",
		"https://gateway.example/ipfs/bafy;/a.png",
		// escaped gateway path, which the gateway reads before decoding
		"https://gateway.example/ipfs%2Fapi%2Fv0%2Fid",
		"https://gateway.example/%69pfs/bafy",
		"https://gateway.example/ipfs/bafy%2Fa.png",
		// gateway query that could change how a proxy splits the request line
		"https://gateway.example/ipfs/bafy?a b /api/v0/id",
		"https://gateway.example/ipfs/bafy?a\x80b",
		// gateway query other than the image transform parameters
		"https://gateway.example/ipfs/bafy?format=car",
		"https://gateway.example/ipfs/bafy?img-width=1280&filename=a.png",
		"https://gateway.example/ipfs/bafy?img-width=1280&img-width=720",
		"https://gateway.example/ipfs/bafy?img-width=%0d%0a",
		"https://gateway.example/ipfs/bafy?img-width=1%26format%3Dcar",
		"https://gateway.example/ipfs/bafy?img-width",
		"https://gateway.example/ipfs/bafy?img-width=",
		// gateway host on another scheme or port, which would skip its rules
		"http://gateway.example/api/v0/id",
		"https://gateway.example:80/api/v0/id",
		"http://GATEWAY.example/api/v0/id",
		// credentials, which would reach the host in an Authorization header
		"https://user:secret@gateway.example/ipfs/bafy",
		"https://user@example.com/a.png",
		"http://gateway.example:443/ipfs/bafy",
		// non-ASCII hosts, which net/http dials in their IDNA form
		"https://ｇateway.example/api/v0/id",
		"https://gateway。example/api/v0/id",
		"https://gate\u00adway.example/api/v0/id",
		"http://ｌｏｃａｌｈｏｓｔ/a.png",
		// trailing dot, which would not match the gateway
		"https://gateway.example./api/v0/id",
	} {
		_, err := f.fetch(context.Background(), rawURL)
		require.ErrorIs(t, err, errImageURLBlocked, rawURL)
	}
}

func TestImageFetchTrustedGateway(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/ipfs/bafy/a.png", r.URL.Path)
		assert.Equal(t, "img-width=1280&img-height=720&img-quality=75&img-fit=cover", r.URL.RawQuery)
		_, _ = w.Write([]byte("image-bytes"))
	}))
	defer srv.Close()

	// The gateway listens on a loopback address, which is blocked for any
	// other host: the trusted gateway must still be reachable.
	f := newImageFetcher(mustImageFetchPolicy(t, srv.URL))
	data, err := f.fetch(context.Background(), srv.URL+"/ipfs/bafy/a.png?img-width=1280&img-height=720&img-quality=75&img-fit=cover")
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
	// The gateway test server also listens on 127.0.0.1. Name the blocked
	// target "localhost" so that the address check refuses it, not the
	// gateway host rule.
	blockedTargetURL := strings.Replace(blockedTarget.URL, "127.0.0.1", "localhost", 1)

	var gatewayURL string
	gateway := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ipfs/to-loopback":
			http.Redirect(w, r, blockedTargetURL+"/a.png", http.StatusFound)
		case "/ipfs/to-metadata":
			http.Redirect(w, r, "http://169.254.169.254/latest/meta-data/", http.StatusFound)
		case "/ipfs/to-file":
			http.Redirect(w, r, "file:///etc/passwd", http.StatusFound)
		case "/ipfs/to-gateway-api":
			http.Redirect(w, r, gatewayURL+"/api/v0/id", http.StatusFound)
		case "/ipfs/to-escaped-gateway-api":
			http.Redirect(w, r, gatewayURL+"/ipfs%2Fapi%2Fv0%2Fid", http.StatusFound)
		case "/ipfs/to-gateway-bad-query":
			http.Redirect(w, r, gatewayURL+"/ipfs/image?a b /api/v0/id", http.StatusFound)
		case "/ipfs/to-gateway-other-param":
			http.Redirect(w, r, gatewayURL+"/ipfs/image?format=car", http.StatusFound)
		case "/ipfs/loop":
			http.Redirect(w, r, gatewayURL+"/ipfs/loop", http.StatusFound)
		case "/ipfs/chain/1", "/ipfs/chain/2", "/ipfs/chain/3", "/ipfs/chain/4":
			next := r.URL.Path[len(r.URL.Path)-1] - '0' + 1
			http.Redirect(w, r, fmt.Sprintf("%s/ipfs/chain/%d", gatewayURL, next), http.StatusFound)
		case "/ipfs/chain/5":
			_, _ = w.Write([]byte("image-bytes"))
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

	for _, path := range []string{"/ipfs/to-loopback", "/ipfs/to-metadata", "/ipfs/to-file", "/ipfs/to-gateway-api", "/ipfs/to-escaped-gateway-api", "/ipfs/to-gateway-bad-query", "/ipfs/to-gateway-other-param", "/ipfs/loop"} {
		_, err := f.fetch(context.Background(), gateway.URL+path)
		require.ErrorIs(t, err, errImageURLBlocked, path)
	}

	data, err := f.fetch(context.Background(), gateway.URL+"/ipfs/to-image")
	require.NoError(t, err)
	require.Equal(t, "image-bytes", string(data))

	// Three redirects are followed, a fourth is refused.
	data, err = f.fetch(context.Background(), gateway.URL+"/ipfs/chain/2")
	require.NoError(t, err)
	require.Equal(t, "image-bytes", string(data))
	_, err = f.fetch(context.Background(), gateway.URL+"/ipfs/chain/1")
	require.ErrorIs(t, err, errImageURLBlocked)
}

func TestImageFetchCheckDialedAddr(t *testing.T) {
	policy := mustImageFetchPolicy(t, "https://gateway.example")
	for _, dialed := range []string{"8.8.8.8:443", "[2606:4700:4700::1111]:80"} {
		require.NoError(t, policy.checkDialedAddr(dialed), dialed)
	}
	for _, dialed := range []string{
		"127.0.0.1:80", "169.254.169.254:80", "[::1]:443", "[::ffff:127.0.0.1]:80",
		"[fe80::1%eth0]:80", "[64:ff9b::a9fe:a9fe]:80", "not-an-address", "example.com:80",
	} {
		require.ErrorIs(t, policy.checkDialedAddr(dialed), errImageURLBlocked, dialed)
	}
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

// The client settings that enforce the policy and bound each fetch are read
// back, so that removing or unwiring one of them fails a test.
func TestImageFetchTransportBounds(t *testing.T) {
	for _, f := range []*imageFetcher{ticketImageFetcher, newImageFetcher(mustImageFetchPolicy(t, "https://gateway.example"))} {
		tr, ok := f.client.Transport.(*http.Transport)
		require.True(t, ok)
		require.Nil(t, tr.Proxy, "the address check must apply to the image host, not a proxy")
		require.NotNil(t, tr.DialContext)
		untrusted := f.dialer("example.com:443")
		require.Equal(t, imageFetchDialTimeout, untrusted.Timeout)
		require.NotNil(t, untrusted.Control, "every host but the gateway is checked at dial time")
		gateway := f.dialer(f.policy.gatewayHost)
		require.Equal(t, imageFetchDialTimeout, gateway.Timeout)
		require.Nil(t, gateway.Control)
		require.Equal(t, imageFetchTLSTimeout, tr.TLSHandshakeTimeout)
		require.Equal(t, imageFetchHeaderTimeout, tr.ResponseHeaderTimeout)
		require.Equal(t, imageFetchTotalTimeout, f.client.Timeout)
		require.NotNil(t, f.client.CheckRedirect)
		require.Equal(t, int64(imageFetchMaxBytes), f.maxBytes)
	}
}

// The URL that ticket PDFs request for an uploaded image must pass the
// policy of the fetcher they use.
func TestTicketImageURLPassesPolicy(t *testing.T) {
	u, err := url.Parse(ticketImageURL(web2URL("ipfs://bafkreifqabflxtsqvaggg2kw4lyju3pckq4osun4vdlltsn7lal7ak5hli")))
	require.NoError(t, err)
	require.NoError(t, ticketImageFetcher.policy.checkURL(u))
}

func mustImageFetchPolicy(t *testing.T, gatewayURL string) imageFetchPolicy {
	t.Helper()
	policy, err := newImageFetchPolicy(gatewayURL)
	require.NoError(t, err)
	return policy
}
