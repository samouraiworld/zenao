package main

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCoverResize(t *testing.T) {
	// 400x400 square: left half red, right half blue, with a green 100 px
	// band at the top that the 16:9 crop must cut off.
	src := image.NewRGBA(image.Rect(0, 0, 400, 400))
	for y := range 400 {
		for x := range 400 {
			c := color.RGBA{R: 255, A: 255}
			if x >= 200 {
				c = color.RGBA{B: 255, A: 255}
			}
			if y < 80 {
				c = color.RGBA{G: 255, A: 255}
			}
			src.SetRGBA(x, y, c)
		}
	}

	dst := coverResize(src, 160, 90)
	require.Equal(t, image.Rect(0, 0, 160, 90), dst.Bounds())
	require.Equal(t, color.RGBA{R: 255, A: 255}, dst.RGBAAt(10, 0), "top row is cropped, not green")
	require.Equal(t, color.RGBA{R: 255, A: 255}, dst.RGBAAt(10, 45))
	require.Equal(t, color.RGBA{B: 255, A: 255}, dst.RGBAAt(150, 45))
}

func TestCoverResizeTransparentAndTiny(t *testing.T) {
	transparent := image.NewNRGBA(image.Rect(0, 0, 2, 1))
	dst := coverResize(transparent, 16, 9)
	require.Equal(t, color.RGBA{R: 255, G: 255, B: 255, A: 255}, dst.RGBAAt(8, 4), "transparent becomes white")

	one := image.NewRGBA(image.Rect(0, 0, 1, 1))
	one.SetRGBA(0, 0, color.RGBA{R: 10, G: 20, B: 30, A: 255})
	dst = coverResize(one, 16, 9)
	require.Equal(t, color.RGBA{R: 10, G: 20, B: 30, A: 255}, dst.RGBAAt(15, 8))
}

func TestTicketImageCacheExpiry(t *testing.T) {
	var pngData bytes.Buffer
	require.NoError(t, png.Encode(&pngData, image.NewRGBA(image.Rect(0, 0, 32, 18))))
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(pngData.Bytes())
	}))
	defer srv.Close()

	oldGateway := ipfsGatewayURL
	ipfsGatewayURL = srv.URL
	defer func() { ipfsGatewayURL = oldGateway }()

	gatewayURL := srv.URL + "/ipfs/" + testCIDA
	otherURL := srv.URL + "/images/event.png"
	for _, u := range []string{gatewayURL, otherURL} {
		img, err := ticketImage(u)
		require.NoError(t, err)
		require.NotEmpty(t, img)
	}

	ticketImageCacheMu.Lock()
	gatewayEntry, gatewayCached := ticketImageCache[gatewayURL]
	otherEntry, otherCached := ticketImageCache[otherURL]
	ticketImageCacheMu.Unlock()
	require.True(t, gatewayCached)
	require.True(t, gatewayEntry.expires.IsZero(), "IPFS gateway files never change")
	require.True(t, otherCached)
	require.False(t, otherEntry.expires.IsZero(), "other URLs can change: they expire")
}

func TestCoverJPEG(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 3000, 500))
	var in bytes.Buffer
	require.NoError(t, png.Encode(&in, src))

	out, err := coverJPEG(in.Bytes(), ticketImageWidth, ticketImageHeight, ticketImageQuality)
	require.NoError(t, err)
	img, err := jpeg.Decode(bytes.NewReader(out))
	require.NoError(t, err)
	require.Equal(t, image.Rect(0, 0, 1280, 720), img.Bounds())

	_, err = coverJPEG([]byte("<svg></svg>"), 16, 9, 75)
	require.ErrorContains(t, err, "unsupported image")

	// A tiny PNG header that declares 100000x100000 pixels is refused before
	// decoding.
	bomb := image.NewGray(image.Rect(0, 0, 1, 1))
	var bombPNG bytes.Buffer
	require.NoError(t, png.Encode(&bombPNG, bomb))
	raw := bombPNG.Bytes()
	// IHDR width and height are bytes 16-23 of a PNG file; its CRC covers
	// bytes 12-28 and is stored in bytes 29-32.
	copy(raw[16:24], []byte{0, 1, 0x86, 0xa0, 0, 1, 0x86, 0xa0})
	binary.BigEndian.PutUint32(raw[29:33], crc32.ChecksumIEEE(raw[12:29]))
	_, err = coverJPEG(raw, 16, 9, 75)
	require.ErrorContains(t, err, "unsupported image size 100000x100000")
}
