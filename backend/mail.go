package main

import (
	"context"
	_ "embed"
	"encoding/base64"
	"fmt"
	"html/template"
	"os"
	"strings"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

var blacklistedDomains = []string{
	"test.com",
}

func newMailCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "mail",
			ShortUsage: "mail",
			ShortHelp:  "generate a fake confirmation mail html content",
		},
		commands.NewEmptyConfig(),
		func(ctx context.Context, args []string) error {
			return execMail()
		},
	)
}

func execMail() error {
	evt := &zeni.Event{
		ImageURI:  "ipfs://bafkreifqabflxtsqvaggg2kw4lyju3pckq4osun4vdlltsn7lal7ak5hli",
		Title:     "PEER IN STEP: n0izn0iz + zooma + pwnh4",
		StartDate: time.Now().Add(time.Hour * 24),
		EndDate:   time.Now().Add(time.Hour * 30),
		Location: &zenaov1.EventLocation{Address: &zenaov1.EventLocation_Custom{Custom: &zenaov1.AddressCustom{
			Address:  "Ground Control - Paris",
			Timezone: "Europe/Paris",
		}}},
	}
	evt.ID = "10"

	// For the browser preview, inline the QR codes as data URIs (real emails use
	// "cid:" references resolved from attachments, which a standalone HTML file
	// cannot display).
	previewTickets := make([]ticketQR, 0, 2)
	for i, secret := range []string{"PREVIEW-TICKET-SECRET-1", "PREVIEW-TICKET-SECRET-2"} {
		png, err := qrCodePNG(secret, ticketEmailQRSize)
		if err != nil {
			return err
		}
		previewTickets = append(previewTickets, ticketQR{
			Src:   template.URL("data:image/png;base64," + base64.StdEncoding.EncodeToString(png)),
			Label: fmt.Sprintf("attendee%d@example.com", i+1),
		})
	}

	ticketsHTML, _, err := ticketsConfirmationMailContent(evt, "Your tickets are attached and shown below.", previewTickets)
	if err != nil {
		return err
	}

	order := &zeni.Order{
		ID:           "ord_9f3a1c7e",
		EventID:      evt.ID,
		AmountMinor:  5000,
		CurrencyCode: "EUR",
	}
	purchaseHTML, purchaseText, err := purchaseConfirmationMailContent(
		evt,
		order,
		paymentSeller{
			Name:         "Ground Control Collective",
			SupportEmail: "support@groundcontrol.example",
			Address:      "12 Rue du Charolais, 75012, Paris, FR",
		},
		"Purchase confirmed! Your tickets will arrive in a separate email.",
	)
	if err != nil {
		return err
	}

	previews := map[string]string{
		"/tmp/zenao-mail-tickets.html":  ticketsHTML,
		"/tmp/zenao-mail-purchase.html": purchaseHTML,
		"/tmp/zenao-mail-purchase.txt":  purchaseText,
	}
	for path, content := range previews {
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			return err
		}
		fmt.Println("wrote", path)
	}

	return nil
}

func eventPublicURL(eventID string) string {
	return fmt.Sprintf("https://zenao.io/event/%s", eventID)
}

func web2URL(uri string) string {
	if !strings.HasPrefix(uri, "ipfs://") {
		return uri
	}
	withoutScheme := strings.TrimPrefix(uri, "ipfs://")
	res := fmt.Sprintf(`https://%s/ipfs/%s`, gatewayDomain, withoutScheme)
	return res
}

const gatewayDomain = `pinata.zenao.io`
