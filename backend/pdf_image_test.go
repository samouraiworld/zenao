package main

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
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
}
