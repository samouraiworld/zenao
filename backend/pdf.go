package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"codeberg.org/go-pdf/fpdf"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/skip2/go-qrcode"
	"go.uber.org/zap"
)

const ZenaoLogoPath = "backend/images/logo.png" // used for the ticket, if not found will not display the logo

type genPdfTicketConfig struct {
	eventID      string
	ticketSecret string
	dbPath       string
}

func (conf *genPdfTicketConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.eventID, "event-id", "", "Event ID")
	flset.StringVar(&conf.ticketSecret, "ticket-secret", "", "Ticket secret")
	flset.StringVar(&conf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
}

func newGenPdfTicketCmd() *commands.Command {
	var genPdfTicketConf genPdfTicketConfig
	return commands.NewCommand(
		commands.Metadata{
			Name:       "gen-pdf-ticket",
			ShortUsage: "gen-pdf-ticket",
			ShortHelp:  "generate a PDF ticket",
		},
		&genPdfTicketConf,
		func(ctx context.Context, args []string) error {
			return execGenPdfTicket(&genPdfTicketConf)
		},
	)
}

func execGenPdfTicket(genPdfTicketConf *genPdfTicketConfig) error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(genPdfTicketConf.dbPath)
	if err != nil {
		return err
	}

	event, err := db.GetEvent(genPdfTicketConf.eventID)
	if err != nil {
		return err
	}

	pdf, err := GeneratePDFTicket(event, genPdfTicketConf.ticketSecret, logger)
	if err != nil {
		return err
	}

	err = os.WriteFile(fmt.Sprintf("%s.pdf", event.Title), pdf, 0644)
	if err != nil {
		return err
	}

	return nil
}

func GeneratePDFTicket(event *zeni.Event, ticketSecret string, logger *zap.Logger) ([]byte, error) {
	pdf := fpdf.New("L", "mm", "A5", "")

	pdf.SetTitle(fmt.Sprintf("Ticket - %s", event.Title), true)
	pdf.SetAuthor("Zenao", true)
	pdf.SetCreationDate(time.Now())

	pdf.AddPage()
	pdf.SetFillColor(0, 0, 0)
	pdf.Rect(0, 0, 210, 148, "F")

	pageWidth := 210.0
	pageHeight := 148.0
	whiteHeight := pageHeight * 2 / 4
	whiteY := pageHeight / 4
	imgWidth := pageWidth * 0.4
	imgY := whiteY

	pdf.SetFillColor(255, 255, 255)
	pdf.Rect(0, whiteY, pageWidth, whiteHeight, "F")

	if event.ImageURI != "" {
		imageURL := web2URL(event.ImageURI)
		if err := embedImageURL(pdf, imageURL, 0, imgY, imgWidth, whiteHeight); err != nil {
			logger.Error("failed to embed image", zap.Error(err))
			drawImagePlaceholder(pdf, 0, imgY, imgWidth)
		}
	}

	textX := imgWidth + 5
	textWidth := pageWidth - textX - 10

	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(textX, whiteY+5)
	pdf.MultiCell(textWidth, 6, event.Title, "", "", false)

	currentY := pdf.GetY() + 2
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(40, 40, 40)
	pdf.SetXY(textX, currentY)
	pdf.Cell(textWidth, 8, event.StartDate.Format("January 2, 2006"))
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetXY(textX, currentY+5)
	pdf.Cell(textWidth, 8, fmt.Sprintf("%s - %s",
		event.StartDate.Format("3:04 PM"),
		event.EndDate.Format("3:04 PM"),
	))

	pdf.SetFont("Helvetica", "U", 10)
	pdf.SetTextColor(255, 128, 0)
	pdf.SetXY(textX, currentY+13)
	linkText := "See event details"
	linkURI := fmt.Sprintf("https://zenao.io/event/%s", event.ID) // TODO: make the domain a variable
	pdf.CellFormat(textWidth, 8, linkText, "", 0, "U", false, 0, linkURI)

	qrCode, err := qrcode.New(ticketSecret, qrcode.Medium)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %w", err)
	}
	tmpFile, err := os.CreateTemp("", "ticket-qr-*.png")
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()
	qrCode.DisableBorder = true
	if err := qrCode.WriteFile(125, tmpFile.Name()); err != nil {
		return nil, fmt.Errorf("failed to write QR code to file: %w", err)
	}
	qrSize := 25.0
	qrX := ((pageWidth-imgWidth)/2 + imgWidth) - qrSize/2
	qrY := whiteY + whiteHeight - qrSize - 15
	pdf.ImageOptions(tmpFile.Name(), qrX, qrY, qrSize, qrSize, false, fpdf.ImageOptions{
		ReadDpi:               true,
		AllowNegativePosition: false,
	}, 0, "")

	logoSize := 10.0
	logoX := pageWidth - logoSize - 3
	logoY := pageHeight - imgY - logoSize - 3
	if _, err := os.Stat(ZenaoLogoPath); os.IsNotExist(err) {
		logger.Error("logo file not found in ticket pdf generation", zap.String("path", ZenaoLogoPath))
	} else {
		pdf.ImageOptions(ZenaoLogoPath, logoX, logoY, logoSize, 0, false, fpdf.ImageOptions{
			ReadDpi:               true,
			AllowNegativePosition: false,
		}, 0, "")
	}

	pdf.SetFont("Helvetica", "U", 8)
	pdf.SetTextColor(255, 128, 0)
	pdf.SetXY(imgWidth+5, pageHeight-imgY-9.5)
	promoText := "Organize your event & tribe for free on zenao.io"
	promoLink := "https://zenao.io/" // TODO: Make this variable
	pdf.CellFormat(pageWidth/2, 5, promoText, "", 0, "", false, 0, promoLink)

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func drawImagePlaceholder(pdf *fpdf.Fpdf, x, y, size float64) {
	pdf.SetDrawColor(180, 180, 180)
	pdf.SetFillColor(240, 240, 240)
	pdf.Rect(x, y, size, size, "FD")

	pdf.SetFont("Helvetica", "I", 12)
	pdf.SetTextColor(120, 120, 120)
	pdf.SetXY(x, y+size/2-5)
	pdf.Cell(size, 10, "Event Image")
}

func embedImageURL(pdf *fpdf.Fpdf, imageURI string, x, y, width, height float64) error {
	resp, err := http.Get(imageURI)
	if err != nil {
		return fmt.Errorf("failed to download image: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download image: %d", resp.StatusCode)
	}
	defer resp.Body.Close()

	bodyStart, err := io.ReadAll(io.LimitReader(resp.Body, 512))
	if err != nil {
		return fmt.Errorf("failed to read image data: %w", err)
	}

	var fileExt string
	contentType := http.DetectContentType(bodyStart)
	switch contentType {
	case "image/jpeg":
		fileExt = ".jpg"
	case "image/png":
		fileExt = ".png"
	case "image/gif":
		fileExt = ".gif"
	default:
		return fmt.Errorf("unsupported image type: %s", contentType)
	}

	imgFile, err := os.CreateTemp("", "event-image-*"+fileExt)
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}
	defer os.Remove(imgFile.Name())
	defer imgFile.Close()

	_, err = imgFile.Write(bodyStart)
	if err != nil {
		return fmt.Errorf("failed to write image data: %w", err)
	}
	_, err = io.Copy(imgFile, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to copy image data: %w", err)
	}

	pdf.ImageOptions(imgFile.Name(), x, y, width, height, false, fpdf.ImageOptions{
		ReadDpi:               true,
		AllowNegativePosition: false,
	}, 0, "")

	return nil
}
