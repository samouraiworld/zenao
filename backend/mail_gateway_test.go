package main

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIsLoopbackURL(t *testing.T) {
	for rawURL, want := range map[string]bool{
		defaultIPFSGatewayURL:            true,
		"http://localhost:8080":          true,
		"http://[::1]:8080":              true,
		"https://ipfs.zenao.io":          false,
		"https://ipfs.staging.zenao.io/": false,
		"http://192.168.1.10:8080":       false,
		"::not a url":                    false,
	} {
		require.Equal(t, want, isLoopbackURL(rawURL), rawURL)
	}
}
