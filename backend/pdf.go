package main

import (
	"bytes"
	"context"
	"embed"
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

//go:embed images/logo.png
var logoFile embed.FS

type genPdfTicketConfig struct {
	eventID      string
	ticketSecret string
	dbPath       string
	output       string
}

func (conf *genPdfTicketConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.eventID, "event-id", "", "Event ID")
	flset.StringVar(&conf.ticketSecret, "ticket-secret", "", "Ticket secret")
	flset.StringVar(&conf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.StringVar(&conf.output, "output", "", "Output path")
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

	pdf, err := GeneratePDFTicket(event, genPdfTicketConf.ticketSecret, "John Doe", "john.doe@example.com", time.Now(), logger)
	if err != nil {
		return err
	}

	outputPath := genPdfTicketConf.output
	if outputPath == "" {
		outputPath = fmt.Sprintf("%s.pdf", event.Title)
	}
	err = os.WriteFile(outputPath, pdf, 0644)
	if err != nil {
		return err
	}

	return nil
}

func GeneratePDFTicket(event *zeni.Event, ticketSecret string, DisplayName string, email string, purchaseDate time.Time, logger *zap.Logger) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("cp1252")

	pdf.SetTitle(fmt.Sprintf("Ticket - %s", event.ID), true)
	pdf.SetAuthor("Zenao", true)
	pdf.SetCreationDate(time.Now())
	pdf.AddPage()

	// A4 size (210x297mm)
	pageWidth := 210.0
	pageHeight := 297.0
	maxTextWidth := (pageWidth - 40) / 2
	widthMargin := 10.0

	pdf.SetFont("Helvetica", "B", 24)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(widthMargin, 10.0)
	pdf.MultiCell(pageWidth-widthMargin*2, 12, tr(event.Title), "", "", false)

	imgWidth := pageWidth - 20
	imgHeight := (imgWidth * 9) / 16
	imgX := 10.0
	imgY := pageHeight/2 - imgHeight/2

	if event.ImageURI != "" {
		imageURL := web2URL(event.ImageURI)
		if err := embedImageURL(pdf, imageURL, imgX, imgY, imgWidth, imgHeight); err != nil {
			logger.Error("failed to embed image", zap.Error(err))
			drawImagePlaceholder(pdf, imgX, imgY, imgWidth, imgHeight)
		}
	} else {
		drawImagePlaceholder(pdf, imgX, imgY, imgWidth, imgHeight)
	}

	infoY := imgY - 50.0

	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(widthMargin, infoY)
	pdf.Cell(maxTextWidth, 6, tr("Date & Time"))
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(51, 51, 51)
	pdf.SetXY(widthMargin, infoY+8)
	pdf.Cell(maxTextWidth, 5, tr(fmt.Sprintf("From: %s", event.StartDate.Format("Monday, January 2, 2006 15:04"))))
	pdf.SetXY(widthMargin, infoY+15)
	pdf.Cell(maxTextWidth, 5, tr(fmt.Sprintf("To: %s", event.EndDate.Format("Monday, January 2, 2006 15:04"))))

	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(widthMargin, infoY+25)
	pdf.Cell(maxTextWidth, 6, tr("Location"))
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return nil, fmt.Errorf("failed to convert location to string: %w", err)
	}
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(51, 51, 51)
	pdf.SetXY(widthMargin, infoY+33)
	pdf.MultiCell(maxTextWidth, 5, tr(locStr), "", "", false)

	qrSize := 40.0
	qrX := pageWidth - qrSize - widthMargin
	qrY := infoY

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

	pdf.ImageOptions(tmpFile.Name(), qrX, qrY, qrSize, qrSize, false, fpdf.ImageOptions{
		ReadDpi:               true,
		AllowNegativePosition: false,
	}, 0, "")

	ticketInfoY := imgY + imgHeight + 10
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(widthMargin, ticketInfoY)
	pdf.Cell(maxTextWidth, 6, "Ticket Information")

	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(51, 51, 51)
	pdf.SetXY(widthMargin, ticketInfoY+8)
	pdf.Cell(maxTextWidth, 5, fmt.Sprintf("Customer: %s - %s", DisplayName, email))
	pdf.SetXY(widthMargin, ticketInfoY+15)
	pdf.Cell(maxTextWidth, 5, fmt.Sprintf("Purchase date: %s", purchaseDate.Format("January 2, 2006 15:04")))

	pdf.SetAutoPageBreak(false, 0)

	bottomY := pageHeight - 15
	footerTextHeight := 5.0

	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(128, 128, 128)
	pdf.SetXY(10, bottomY)
	footerText := "Delivered by ZENAO - contact@zenao.io"
	pdf.Cell(float64(len(footerText)*2), footerTextHeight, footerText)

	logoSize := 12.0
	zenaoTextWidth := 20.0
	totalRightWidth := logoSize + zenaoTextWidth

	logoX := pageWidth - totalRightWidth - 10
	logoY := bottomY - (logoSize-footerTextHeight)/2

	logoBytes, err := logoFile.ReadFile("images/logo.png")
	if err != nil {
		logger.Error("failed to read embedded logo", zap.Error(err))
	} else {
		tmpFile, err := os.CreateTemp("", "zenao-logo-*.png")
		if err != nil {
			logger.Error("failed to create temporary file for logo", zap.Error(err))
		} else {
			defer os.Remove(tmpFile.Name())
			if _, err := tmpFile.Write(logoBytes); err != nil {
				logger.Error("failed to write logo to temporary file", zap.Error(err))
			} else {
				pdf.ImageOptions(tmpFile.Name(), logoX, logoY, logoSize, 0, false, fpdf.ImageOptions{
					ReadDpi:               true,
					AllowNegativePosition: false,
				}, 0, "")

				pdf.SetFont("Helvetica", "B", 14)
				pdf.SetTextColor(0, 0, 0)
				textY := logoY + (logoSize / 2) - 3
				pdf.SetXY(logoX+logoSize+2, textY)
				pdf.Cell(zenaoTextWidth, 6, "ZENAO")
			}
		}
	}

	pdf.SetAutoPageBreak(true, 0)

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func drawImagePlaceholder(pdf *fpdf.Fpdf, x, y, width, height float64) {
	pdf.SetDrawColor(180, 180, 180)
	pdf.SetFillColor(240, 240, 240)
	pdf.Rect(x, y, width, height, "FD")

	pdf.SetFont("Helvetica", "I", 12)
	pdf.SetTextColor(120, 120, 120)
	pdf.SetXY(width/2-5, y+height/2-5)
	pdf.Cell(0, 10, "Event Image")
}

func embedImageURL(pdf *fpdf.Fpdf, imageURI string, x, y, width, height float64) error {
	optimizedURL := fmt.Sprintf("%s?img-width=1280&img-height=720&img-quality=75&img-fit=cover", imageURI)
	resp, err := http.Get(optimizedURL)
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
