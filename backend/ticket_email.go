package main

import (
	"fmt"
	"html/template"
	"time"

	"github.com/resend/resend-go/v2"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// ticketEmailQRSize is the pixel size of the QR code images (inline in emails
// and embedded in the PDF tickets).
const ticketEmailQRSize = 240

// maxInlineQRTickets caps how many QR codes are inlined in the email body.
// Above this, the body would be huge and the message risks exceeding provider
// size limits, so we keep the PDF tickets (which still carry the QR) but skip
// the inline QR images.
const maxInlineQRTickets = 25

// ticketEmailItem describes one attendee ticket to render in a confirmation
// email (inline QR + attached PDF).
type ticketEmailItem struct {
	Secret      string
	DisplayName string
	Email       string
}

// buildTicketEmailAttachments builds, for a single confirmation email, the
// inline QR descriptors plus the matching resend attachments: one PDF ticket
// and one inline QR image per ticket, and a single shared ICS calendar invite.
//
// All tickets for an order/registration are bundled into one email addressed to
// the buyer only. The QR codes are entry tokens, so they are never delivered to
// attendee-provided emails (which could contain a typo and leak access).
func buildTicketEmailAttachments(evt *zeni.Event, items []ticketEmailItem, mailSender string, logger *zap.Logger) ([]ticketQR, []*resend.Attachment, error) {
	inlineQR := len(items) <= maxInlineQRTickets

	qrs := make([]ticketQR, 0, len(items))
	attachments := make([]*resend.Attachment, 0, len(items)*2+1)

	for i, item := range items {
		// One QR encode per ticket, reused for both the PDF and (when inlined)
		// the email body, avoiding a second encode.
		qrData, err := qrCodePNG(item.Secret, ticketEmailQRSize)
		if err != nil {
			return nil, nil, err
		}

		pdfData, err := GeneratePDFTicket(evt, item.Secret, item.DisplayName, item.Email, time.Now(), qrData, logger)
		if err != nil {
			return nil, nil, err
		}

		attachments = append(attachments, &resend.Attachment{
			Content:     pdfData,
			Filename:    fmt.Sprintf("ticket_%s_%d.pdf", evt.ID, i+1),
			ContentType: "application/pdf",
		})

		if !inlineQR {
			continue
		}

		label := item.DisplayName
		if label == "" {
			label = item.Email
		}
		if label == "" {
			label = fmt.Sprintf("Ticket %d", i+1)
		}

		cid := fmt.Sprintf("ticket-qr-%d", i)
		qrs = append(qrs, ticketQR{
			Src:   template.URL("cid:" + cid),
			Label: label,
		})
		attachments = append(attachments, &resend.Attachment{
			Content:     qrData,
			Filename:    fmt.Sprintf("ticket_qr_%s_%d.png", evt.ID, i+1),
			ContentType: "image/png",
			ContentId:   cid,
		})
	}

	attachments = append(attachments, &resend.Attachment{
		Content:     GenerateICS(evt, mailSender, logger),
		Filename:    fmt.Sprintf("zenao_events_%s.ics", evt.ID),
		ContentType: "text/calendar",
	})

	return qrs, attachments, nil
}
