package main

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIsPublicHTTPSURL(t *testing.T) {
	for rawURL, want := range map[string]bool{
		"https://ipfs.zenao.io":          true,
		"https://ipfs.staging.zenao.io/": true,
		"https://62.210.92.144":          true,
		defaultIPFSGatewayURL:            false,
		"http://ipfs.zenao.io":           false,
		"https://localhost:8080":         false,
		"https://app.localhost":          false,
		"https://[::1]:8080":             false,
		"https://ipfs:8080":              false,
		"https://192.168.1.10:8080":      false,
		"https://0.0.0.0":                false,
		"127.0.0.1:8080":                 false,
		"::not a url":                    false,
	} {
		require.Equal(t, want, isPublicHTTPSURL(rawURL), rawURL)
	}
}
