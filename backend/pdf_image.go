package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/gif" // register the GIF decoder for image.Decode
	"image/jpeg"
	_ "image/png" // register the PNG decoder for image.Decode
	"io"
	"net/http"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

const (
	// Ticket PDFs embed the event image cropped to 16:9 and scaled to
	// 1280x720 JPEG, quality 75: what the Pinata image resizer returned for
	// the former img-* query parameters. The kubo gateway serves originals.
	ticketImageWidth   = 1280
	ticketImageHeight  = 720
	ticketImageQuality = 75

	// maxTicketImageDownload bounds the download of the original image.
	maxTicketImageDownload = 20 << 20

	// maxTicketImagePixels bounds the decoded size: a small compressed file
	// can declare huge dimensions (decompression bomb).
	maxTicketImagePixels = 30_000_000

	// maxTicketImageCacheEntries bounds the processed image cache (about
	// 100 KiB per entry).
	maxTicketImageCacheEntries = 64
)

var (
	ticketImageClient = &http.Client{Timeout: 30 * time.Second}

	// ticketImageCache keeps processed images by URL: one email can hold many
	// tickets for the same event, and ipfs:// images never change.
	ticketImageCacheMu sync.Mutex
	ticketImageCache   = map[string][]byte{}

	// ticketImageGroup makes concurrent requests for the same URL share one
	// download and decode.
	ticketImageGroup singleflight.Group
)

// ticketImage downloads the image at imageURL and returns it as a 1280x720
// JPEG, cropped to fill the frame.
func ticketImage(imageURL string) ([]byte, error) {
	ticketImageCacheMu.Lock()
	cached, ok := ticketImageCache[imageURL]
	ticketImageCacheMu.Unlock()
	if ok {
		return cached, nil
	}

	img, err, _ := ticketImageGroup.Do(imageURL, func() (any, error) {
		return fetchTicketImage(imageURL)
	})
	if err != nil {
		return nil, err
	}
	return img.([]byte), nil
}

func fetchTicketImage(imageURL string) ([]byte, error) {
	resp, err := ticketImageClient.Get(imageURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to download image: %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxTicketImageDownload+1))
	if err != nil {
		return nil, fmt.Errorf("failed to read image data: %w", err)
	}
	if len(data) > maxTicketImageDownload {
		return nil, fmt.Errorf("image larger than %d bytes", maxTicketImageDownload)
	}

	img, err := coverJPEG(data, ticketImageWidth, ticketImageHeight, ticketImageQuality)
	if err != nil {
		return nil, err
	}

	ticketImageCacheMu.Lock()
	if len(ticketImageCache) >= maxTicketImageCacheEntries {
		clear(ticketImageCache)
	}
	ticketImageCache[imageURL] = img
	ticketImageCacheMu.Unlock()
	return img, nil
}

// coverJPEG decodes a JPEG, PNG or GIF image, crops it around its center to
// the w:h aspect ratio, scales it to w x h and encodes it as JPEG.
func coverJPEG(data []byte, w, h, quality int) ([]byte, error) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("unsupported image: %w", err)
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || int64(cfg.Width)*int64(cfg.Height) > maxTicketImagePixels {
		return nil, fmt.Errorf("unsupported image size %dx%d", cfg.Width, cfg.Height)
	}

	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("unsupported image: %w", err)
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, coverResize(src, w, h), &jpeg.Options{Quality: quality}); err != nil {
		return nil, fmt.Errorf("failed to encode image: %w", err)
	}
	return buf.Bytes(), nil
}

// coverResize crops src around its center to the w:h aspect ratio and scales
// the result to w x h. Each destination pixel is the average of the source
// pixels it covers (box filter). Transparent pixels are drawn over white.
func coverResize(src image.Image, w, h int) *image.RGBA {
	b := src.Bounds()
	sw, sh := b.Dx(), b.Dy()

	// Largest centered crop with the w:h aspect ratio.
	cw, ch := sw, sw*h/w
	if ch > sh {
		cw, ch = sh*w/h, sh
	}
	cw, ch = max(cw, 1), max(ch, 1)
	x0 := b.Min.X + (sw-cw)/2
	y0 := b.Min.Y + (sh-ch)/2

	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	for dy := range h {
		sy0 := y0 + dy*ch/h
		sy1 := max(y0+(dy+1)*ch/h, sy0+1)
		for dx := range w {
			sx0 := x0 + dx*cw/w
			sx1 := max(x0+(dx+1)*cw/w, sx0+1)

			var r, g, bl, a, n uint64
			for sy := sy0; sy < sy1; sy++ {
				for sx := sx0; sx < sx1; sx++ {
					cr, cg, cb, ca := src.At(sx, sy).RGBA()
					r, g, bl, a = r+uint64(cr), g+uint64(cg), bl+uint64(cb), a+uint64(ca)
					n++
				}
			}
			// Premultiplied average, composited over white.
			white := 0xffff - a/n
			dst.SetRGBA(dx, dy, color.RGBA{
				R: uint8((r/n + white) >> 8),
				G: uint8((g/n + white) >> 8),
				B: uint8((bl/n + white) >> 8),
				A: 0xff,
			})
		}
	}
	return dst
}
