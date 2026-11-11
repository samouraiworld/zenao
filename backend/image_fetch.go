package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"syscall"
	"time"
)

// Event images are set by event organizers, so the server must not fetch
// them like any other URL: a fetch could reach internal services. Every
// server-side image fetch goes through an imageFetcher, which only reaches
// the configured IPFS gateway (for /ipfs/ paths) or public addresses.

// errImageURLBlocked marks an image URL refused by the fetch policy.
var errImageURLBlocked = errors.New("image URL refused by fetch policy")

const (
	imageFetchMaxBytes        = 20 << 20
	imageFetchMaxRedirects    = 3
	imageFetchDialTimeout     = 5 * time.Second
	imageFetchTLSTimeout      = 5 * time.Second
	imageFetchHeaderTimeout   = 10 * time.Second
	imageFetchTotalTimeout    = 20 * time.Second
	imageFetchGatewayPathRoot = "/ipfs/"
)

// ticketImageFetcher fetches the event image embedded in ticket PDFs. The
// trusted gateway is the one web2URL renders ipfs:// URIs with.
var ticketImageFetcher = newImageFetcher(mustNewImageFetchPolicy("https://" + gatewayDomain))

// imageFetchPolicy decides which URLs and addresses an imageFetcher reaches.
type imageFetchPolicy struct {
	// gatewayScheme and gatewayHost (lower-case host:port) identify the IPFS
	// gateway. It is trusted for /ipfs/ paths only, whatever address it
	// resolves to: it can run on a private network.
	gatewayScheme string
	gatewayHost   string
	// allowAnyPort lifts the 80/443 port limit on other hosts (tests only).
	allowAnyPort bool
	// allowAddr reports whether an address can be dialed for a host other
	// than the gateway.
	allowAddr func(netip.Addr) bool
}

func newImageFetchPolicy(gatewayURL string) (imageFetchPolicy, error) {
	u, err := url.Parse(gatewayURL)
	if err != nil {
		return imageFetchPolicy{}, fmt.Errorf("parse gateway URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return imageFetchPolicy{}, fmt.Errorf("gateway URL scheme must be http or https: %q", gatewayURL)
	}
	if u.Hostname() == "" {
		return imageFetchPolicy{}, fmt.Errorf("gateway URL has no host: %q", gatewayURL)
	}
	return imageFetchPolicy{
		gatewayScheme: u.Scheme,
		gatewayHost:   canonicalHostPort(u),
		allowAddr:     isPublicImageAddr,
	}, nil
}

func mustNewImageFetchPolicy(gatewayURL string) imageFetchPolicy {
	policy, err := newImageFetchPolicy(gatewayURL)
	if err != nil {
		panic(err)
	}
	return policy
}

// canonicalHostPort returns the lower-case host:port of an http(s) URL, with
// the default port of its scheme when the URL has none.
func canonicalHostPort(u *url.URL) string {
	port := u.Port()
	if port == "" {
		port = "80"
		if u.Scheme == "https" {
			port = "443"
		}
	}
	return net.JoinHostPort(strings.ToLower(u.Hostname()), port)
}

// checkURL applies the URL part of the policy. The address part is applied
// when dialing, on the address actually dialed.
func (p imageFetchPolicy) checkURL(u *url.URL) error {
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("%w: scheme %q", errImageURLBlocked, u.Scheme)
	}
	if u.Hostname() == "" {
		return fmt.Errorf("%w: no host", errImageURLBlocked)
	}

	hostPort := canonicalHostPort(u)
	if hostPort == p.gatewayHost {
		if u.Scheme != p.gatewayScheme || !isGatewayContentPath(u.Path) {
			return fmt.Errorf("%w: gateway path %q", errImageURLBlocked, u.Path)
		}
		return nil
	}

	if !p.allowAnyPort {
		if port := u.Port(); port != "" && port != "80" && port != "443" {
			return fmt.Errorf("%w: port %s", errImageURLBlocked, port)
		}
	}
	return nil
}

// isGatewayContentPath reports whether a decoded URL path stays under
// /ipfs/, with no dot segment a server could resolve elsewhere.
func isGatewayContentPath(p string) bool {
	if !strings.HasPrefix(p, imageFetchGatewayPathRoot) {
		return false
	}
	for _, segment := range strings.Split(p, "/") {
		if segment == "." || segment == ".." {
			return false
		}
	}
	return true
}

var nonPublicImagePrefixes = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),       // "this" network
	netip.MustParsePrefix("100.64.0.0/10"),   // shared address space (CGNAT)
	netip.MustParsePrefix("192.0.0.0/24"),    // IETF protocol assignments
	netip.MustParsePrefix("192.0.2.0/24"),    // documentation
	netip.MustParsePrefix("198.18.0.0/15"),   // benchmarking
	netip.MustParsePrefix("198.51.100.0/24"), // documentation
	netip.MustParsePrefix("203.0.113.0/24"),  // documentation
	netip.MustParsePrefix("240.0.0.0/4"),     // reserved, broadcast
	netip.MustParsePrefix("::/96"),           // IPv4-compatible, unspecified, loopback
	netip.MustParsePrefix("::ffff:0:0:0/96"), // IPv4-translated
	netip.MustParsePrefix("64:ff9b::/96"),    // NAT64
	netip.MustParsePrefix("64:ff9b:1::/48"),  // local-use NAT64
	netip.MustParsePrefix("100::/64"),        // discard
	netip.MustParsePrefix("2001::/32"),       // Teredo
	netip.MustParsePrefix("2001:db8::/32"),   // documentation
	netip.MustParsePrefix("2002::/16"),       // 6to4
	netip.MustParsePrefix("fec0::/10"),       // deprecated site-local
}

// isPublicImageAddr reports whether addr is a public unicast address. It
// refuses loopback, private, link-local (including cloud metadata),
// multicast, unspecified and special-purpose addresses, in IPv4, IPv6 and
// IPv4-mapped IPv6 forms.
func isPublicImageAddr(addr netip.Addr) bool {
	addr = addr.Unmap()
	if !addr.IsValid() || !addr.IsGlobalUnicast() || addr.IsPrivate() {
		return false
	}
	for _, prefix := range nonPublicImagePrefixes {
		if prefix.Contains(addr) {
			return false
		}
	}
	return true
}

// imageFetcher downloads images under an imageFetchPolicy.
type imageFetcher struct {
	policy   imageFetchPolicy
	client   *http.Client
	maxBytes int64
}

func newImageFetcher(policy imageFetchPolicy) *imageFetcher {
	f := &imageFetcher{policy: policy, maxBytes: imageFetchMaxBytes}
	transport := &http.Transport{
		// No proxy: the address check must apply to the image host itself.
		Proxy:                 nil,
		DialContext:           f.dialContext,
		ForceAttemptHTTP2:     true,
		TLSHandshakeTimeout:   imageFetchTLSTimeout,
		ResponseHeaderTimeout: imageFetchHeaderTimeout,
		MaxIdleConns:          10,
		IdleConnTimeout:       90 * time.Second,
	}
	f.client = &http.Client{
		Transport: transport,
		Timeout:   imageFetchTotalTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > imageFetchMaxRedirects {
				return fmt.Errorf("%w: more than %d redirects", errImageURLBlocked, imageFetchMaxRedirects)
			}
			return f.policy.checkURL(req.URL)
		},
	}
	return f
}

// dialContext dials the gateway as is and checks every other address right
// before connecting, after name resolution, so that a host name cannot
// resolve to a refused address at fetch time.
func (f *imageFetcher) dialContext(ctx context.Context, network, address string) (net.Conn, error) {
	dialer := &net.Dialer{Timeout: imageFetchDialTimeout}
	if strings.ToLower(address) != f.policy.gatewayHost {
		dialer.Control = func(_, dialed string, _ syscall.RawConn) error {
			addrPort, err := netip.ParseAddrPort(dialed)
			if err != nil {
				return fmt.Errorf("%w: address %q", errImageURLBlocked, dialed)
			}
			if !f.policy.allowAddr(addrPort.Addr()) {
				return fmt.Errorf("%w: address %s", errImageURLBlocked, addrPort.Addr())
			}
			return nil
		}
	}
	return dialer.DialContext(ctx, network, address)
}

// fetch downloads rawURL under the policy and returns its body.
func (f *imageFetcher) fetch(ctx context.Context, rawURL string) ([]byte, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid URL", errImageURLBlocked)
	}
	if err := f.policy.checkURL(u); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download image: status %d", resp.StatusCode)
	}
	if resp.ContentLength > f.maxBytes {
		return nil, fmt.Errorf("download image: %d bytes, limit %d", resp.ContentLength, f.maxBytes)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, f.maxBytes+1))
	if err != nil {
		return nil, fmt.Errorf("read image: %w", err)
	}
	if int64(len(data)) > f.maxBytes {
		return nil, fmt.Errorf("download image: more than %d bytes", f.maxBytes)
	}
	return data, nil
}
