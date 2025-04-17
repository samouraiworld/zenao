package main

import (
	_ "embed"
	"html/template"
	"strings"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
)

//go:embed mails/html/tickets-confirmation.tmpl.html
var ticketsConfirmationTmplHTMLSrc string
var ticketsConfirmationTmplHTML *template.Template

//go:embed mails/text/tickets-confirmation.tmpl.txt
var ticketsConfirmationTmplTextSrc string
var ticketsConfirmationTmplText *template.Template

//go:embed mails/html/notify-participants-event-edited.tmpl.html
var notifyParticipantsEventEditedTmplHTMLSrc string
var notifyParticipantsEventEditedTmplHTML *template.Template

//go:embed mails/text/notify-participants-event-edited.tmpl.txt
var notifyParticipantsEventEditedTmplTextSrc string
var notifyParticipantsEventEditedTmplText *template.Template

func init() {
	tmpl, err := template.New("ticketsConfirmationHTML").Parse(ticketsConfirmationTmplHTMLSrc)
	if err != nil {
		panic(err)
	}
	ticketsConfirmationTmplHTML = tmpl

	tmpl, err = template.New("ticketsConfirmationText").Parse(ticketsConfirmationTmplTextSrc)
	if err != nil {
		panic(err)
	}
	ticketsConfirmationTmplText = tmpl

	tmpl, err = template.New("notifyParticipantsEventEditedHTML").Parse(notifyParticipantsEventEditedTmplHTMLSrc)
	if err != nil {
		panic(err)
	}
	notifyParticipantsEventEditedTmplHTML = tmpl

	tmpl, err = template.New("notifyParticipantsEventEditedText").Parse(notifyParticipantsEventEditedTmplTextSrc)
	if err != nil {
		panic(err)
	}
	notifyParticipantsEventEditedTmplText = tmpl
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
}

func ticketsConfirmationMailContent(event *zeni.Event, welcomeText string) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := event.Timezone()
	if err != nil {
		return "", "", err
	}
	data := ticketsConfirmation{
		ImageURL:        web2URL(event.ImageURI) + "?img-width=600&img-height=400&img-fit=cover&dpr=2",
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
		PinIconURL:      web2URL("ipfs://bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"),
		EventName:       event.Title,
		TimeText:        event.StartDate.In(tz).Format(time.ANSIC) + " - " + event.EndDate.In(tz).Format(time.ANSIC),
		LocationText:    locStr,
		EventURL:        eventPublicURL(event.ID),
		WelcomeText:     welcomeText,
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

type notifyParticipantsEventEdited struct {
	ImageURL        string
	EventName       string
	TimeText        string
	LocationText    string
	EventURL        string
	CalendarIconURL string
	PinIconURL      string
	UserName        string
}

func notifyParticipantsEventEditedMailContent(event *zeni.Event, userName string) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := event.Timezone()
	if err != nil {
		return "", "", err
	}
	data := notifyParticipantsEventEdited{
		ImageURL:        web2URL(event.ImageURI) + "?img-width=600&img-height=400&img-fit=cover&dpr=2",
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
		PinIconURL:      web2URL("ipfs://bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"),
		EventName:       event.Title,
		TimeText:        event.StartDate.In(tz).Format(time.ANSIC) + " - " + event.EndDate.In(tz).Format(time.ANSIC),
		LocationText:    locStr,
		EventURL:        eventPublicURL(event.ID),
		UserName:        userName,
	}

	buf := &strings.Builder{}
	if err := notifyParticipantsEventEditedTmplHTML.Execute(buf, data); err != nil {
		return "", "", err
	}
	htmlContent := buf.String()

	buf = &strings.Builder{}
	if err := notifyParticipantsEventEditedTmplText.Execute(buf, data); err != nil {
		return "", "", err
	}
	textContent := buf.String()

	return htmlContent, textContent, nil
}
