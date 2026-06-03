package main

import (
	_ "embed"
	"fmt"
	"html/template"
	"strings"
	texttemplate "text/template"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
)

//go:embed mails/html/tickets-confirmation.tmpl.html
var ticketsConfirmationTmplHTMLSrc string
var ticketsConfirmationTmplHTML *template.Template

//go:embed mails/text/tickets-confirmation.tmpl.txt
var ticketsConfirmationTmplTextSrc string
var ticketsConfirmationTmplText *texttemplate.Template

//go:embed mails/html/purchase-confirmation.tmpl.html
var purchaseConfirmationTmplHTMLSrc string
var purchaseConfirmationTmplHTML *template.Template

//go:embed mails/text/purchase-confirmation.tmpl.txt
var purchaseConfirmationTmplTextSrc string
var purchaseConfirmationTmplText *texttemplate.Template

//go:embed mails/html/event-broadcast-message.tmpl.html
var eventBroadcastMessageTmplHTMLSrc string
var eventBroadcastMessageTmplHTML *template.Template

//go:embed mails/text/event-broadcast-message.tmpl.txt
var eventBroadcastMessageTmplTextSrc string
var eventBroadcastMessageTmplText *texttemplate.Template

//go:embed mails/html/community-new-event.tmpl.html
var communityNewEventTmplHTMLSrc string
var communityNewEventTmplHTML *template.Template

//go:embed mails/text/community-new-event.tmpl.txt
var communityNewEventTmplTextSrc string
var communityNewEventTmplText *texttemplate.Template

//go:embed mails/html/event-cancelled.tmpl.html
var eventCancelledTmplHTMLSrc string
var eventCancelledTmplHTML *template.Template

//go:embed mails/text/event-cancelled.tmpl.txt
var eventCancelledTmplTextSrc string
var eventCancelledTmplText *texttemplate.Template

// mustParseHTML parses an HTML mail template, panicking on error (templates are
// embedded at build time, so a parse failure is a programming error).
func mustParseHTML(name, src string) *template.Template {
	return template.Must(template.New(name).Parse(src))
}

// mustParseText parses a plain-text mail template. Text variants use
// text/template (not html/template) so plain-text bodies are not HTML-escaped
// (e.g. a "+" in a title would otherwise be rendered as "&#43;").
func mustParseText(name, src string) *texttemplate.Template {
	return texttemplate.Must(texttemplate.New(name).Parse(src))
}

func init() {
	ticketsConfirmationTmplHTML = mustParseHTML("ticketsConfirmationHTML", ticketsConfirmationTmplHTMLSrc)
	ticketsConfirmationTmplText = mustParseText("ticketsConfirmationText", ticketsConfirmationTmplTextSrc)

	purchaseConfirmationTmplHTML = mustParseHTML("purchaseConfirmationHTML", purchaseConfirmationTmplHTMLSrc)
	purchaseConfirmationTmplText = mustParseText("purchaseConfirmationText", purchaseConfirmationTmplTextSrc)

	eventBroadcastMessageTmplHTML = mustParseHTML("eventBroadcastMessageHTML", eventBroadcastMessageTmplHTMLSrc)
	eventBroadcastMessageTmplText = mustParseText("eventBroadcastMessageText", eventBroadcastMessageTmplTextSrc)

	communityNewEventTmplHTML = mustParseHTML("communityNewEventHTML", communityNewEventTmplHTMLSrc)
	communityNewEventTmplText = mustParseText("communityNewEventText", communityNewEventTmplTextSrc)

	eventCancelledTmplHTML = mustParseHTML("eventCancelledHTML", eventCancelledTmplHTMLSrc)
	eventCancelledTmplText = mustParseText("eventCancelledText", eventCancelledTmplTextSrc)
}

// ticketQR is one inline QR code rendered in a ticket confirmation email. Src
// is a full image src ("cid:..." for real emails, or a data URI for previews)
// and is typed as template.URL so html/template does not strip the scheme.
type ticketQR struct {
	Src   template.URL
	Label string
}

type ticketsConfirmation struct {
	ImageURL        string
	EventName       string
	TimeText        string
	LocationText    string
	EventURL        string
	CalendarIconURL string
	PinIconURL      string
	WelcomeText     string
	Tickets         []ticketQR
	// Src is unused in the body but satisfies the top-level
	// <link rel="preload" href="{{.Src}}"> that react-email hoists out of the
	// per-ticket QR <img>. Left empty so that preload resolves to an empty href.
	Src string
}

func ticketsConfirmationMailContent(event *zeni.Event, welcomeText string, tickets []ticketQR) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := event.Timezone()
	if err != nil {
		return "", "", err
	}
	data := ticketsConfirmation{
		ImageURL:        web2URL(event.ImageURI) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
		PinIconURL:      web2URL("ipfs://bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"),
		EventName:       event.Title,
		TimeText:        event.StartDate.In(tz).Format(time.ANSIC) + " - " + event.EndDate.In(tz).Format(time.ANSIC),
		LocationText:    locStr,
		EventURL:        eventPublicURL(event.ID),
		WelcomeText:     welcomeText,
		Tickets:         tickets,
	}

	buf := &strings.Builder{}
	if err := ticketsConfirmationTmplHTML.Execute(buf, data); err != nil {
		return "", "", err
	}
	htmlContent := buf.String()

	buf = &strings.Builder{}
	if err := ticketsConfirmationTmplText.Execute(buf, data); err != nil {
		return "", "", err
	}
	textContent := buf.String()

	return htmlContent, textContent, nil
}

type purchaseConfirmation struct {
	ImageURL        string
	EventName       string
	TimeText        string
	LocationText    string
	EventURL        string
	CalendarIconURL string
	PinIconURL      string
	WelcomeText     string
	OrderID         string
	AmountText      string
	SellerName      string
	SupportEmail    string
	SellerAddress   string
	// LegalNote explains that the formal payment receipt is issued by the seller
	// (the community / merchant of record on Stripe), not by Zenao.
	LegalNote string
}

// paymentSeller carries the merchant-of-record details shown to the buyer. In
// Stripe Connect direct charges the connected account (the community) is the
// seller, so these fields come from its Stripe business profile, falling back
// to the community display name.
type paymentSeller struct {
	Name         string
	SupportEmail string
	Address      string
}

func purchaseConfirmationMailContent(event *zeni.Event, order *zeni.Order, seller paymentSeller, welcomeText string) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := event.Timezone()
	if err != nil {
		return "", "", err
	}

	sellerName := strings.TrimSpace(seller.Name)
	if sellerName == "" {
		sellerName = "the event organizer"
	}

	data := purchaseConfirmation{
		ImageURL:        web2URL(event.ImageURI) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
		PinIconURL:      web2URL("ipfs://bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"),
		EventName:       event.Title,
		TimeText:        event.StartDate.In(tz).Format(time.ANSIC) + " - " + event.EndDate.In(tz).Format(time.ANSIC),
		LocationText:    locStr,
		EventURL:        eventPublicURL(event.ID),
		WelcomeText:     welcomeText,
		OrderID:         order.ID,
		AmountText:      formatAmountMinor(order.AmountMinor, order.CurrencyCode),
		SellerName:      sellerName,
		SupportEmail:    strings.TrimSpace(seller.SupportEmail),
		SellerAddress:   strings.TrimSpace(seller.Address),
		LegalNote:       "This purchase was made from " + sellerName + ". The official payment receipt is sent separately by " + sellerName + " through Stripe. Zenao operates the platform on their behalf.",
	}

	buf := &strings.Builder{}
	if err := purchaseConfirmationTmplHTML.Execute(buf, data); err != nil {
		return "", "", err
	}
	htmlContent := buf.String()

	buf = &strings.Builder{}
	if err := purchaseConfirmationTmplText.Execute(buf, data); err != nil {
		return "", "", err
	}
	textContent := buf.String()

	return htmlContent, textContent, nil
}

// formatAmountMinor renders a Stripe-style minor-unit amount (e.g. cents) as a
// human-readable string such as "12.00 EUR". Zero-decimal currencies (e.g. JPY)
// are an unsupported edge case for now and would be over-divided.
func formatAmountMinor(amountMinor int64, currencyCode string) string {
	currencyCode = strings.ToUpper(strings.TrimSpace(currencyCode))
	amount := fmt.Sprintf("%.2f", float64(amountMinor)/100)
	if currencyCode == "" {
		return amount
	}
	return amount + " " + currencyCode
}

type eventBroadcast struct {
	EventName string
	ImageURL  string
	Message   string
	EventURL  string
}

func eventBroadcastMailContent(event *zeni.Event, message string) (string, string, error) {
	data := eventBroadcast{
		ImageURL:  web2URL(event.ImageURI) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		EventName: event.Title,
		Message:   message,
		EventURL:  eventPublicURL(event.ID),
	}

	buf := &strings.Builder{}
	if err := eventBroadcastMessageTmplHTML.Execute(buf, data); err != nil {
		return "", "", err
	}
	htmlContent := buf.String()

	buf = &strings.Builder{}
	if err := eventBroadcastMessageTmplText.Execute(buf, data); err != nil {
		return "", "", err
	}
	textContent := buf.String()

	return htmlContent, textContent, nil
}

type communityNewEvent struct {
	EventName       string
	EventImage      string
	EventDate       string
	EventEndDate    string
	EventURL        string
	CommunityName   string
	CommunityImage  string
	CalendarIconURL string
}

func communityNewEventMailContent(event *zeni.Event, community *zeni.Community) (string, string, error) {
	data := communityNewEvent{
		EventName:       event.Title,
		EventImage:      web2URL(event.ImageURI) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		EventDate:       event.StartDate.Format(time.ANSIC),
		EventEndDate:    event.EndDate.Format(time.ANSIC),
		EventURL:        eventPublicURL(event.ID),
		CommunityName:   community.DisplayName,
		CommunityImage:  web2URL(community.AvatarURI) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
	}

	buf := &strings.Builder{}
	if err := communityNewEventTmplHTML.Execute(buf, data); err != nil {
		return "", "", err
	}
	htmlContent := buf.String()

	buf = &strings.Builder{}
	if err := communityNewEventTmplText.Execute(buf, data); err != nil {
		return "", "", err
	}

	textContent := buf.String()

	return htmlContent, textContent, nil
}

type eventCancelled struct {
	ImageURL        string
	EventName       string
	EventStartDate  string
	EventEndDate    string
	LocationText    string
	CalendarIconURL string
	PinIconURL      string
}

func eventCancelledMailContent(event *zeni.Event) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := event.Timezone()
	if err != nil {
		return "", "", err
	}

	data := eventCancelled{
		ImageURL:        web2URL(event.ImageURI) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		EventName:       event.Title,
		EventStartDate:  event.StartDate.In(tz).Format(time.ANSIC),
		EventEndDate:    event.EndDate.In(tz).Format(time.ANSIC),
		LocationText:    locStr,
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
		PinIconURL:      web2URL("ipfs://bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"),
	}

	buf := &strings.Builder{}
	if err := eventCancelledTmplHTML.Execute(buf, data); err != nil {
		return "", "", err
	}
	htmlContent := buf.String()

	buf = &strings.Builder{}
	if err := eventCancelledTmplText.Execute(buf, data); err != nil {
		return "", "", err
	}
	textContent := buf.String()

	return htmlContent, textContent, nil
}
