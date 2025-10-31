package main

import (
	_ "embed"
	"html/template"
	"strings"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

//go:embed mails/html/tickets-confirmation.tmpl.html
var ticketsConfirmationTmplHTMLSrc string
var ticketsConfirmationTmplHTML *template.Template

//go:embed mails/text/tickets-confirmation.tmpl.txt
var ticketsConfirmationTmplTextSrc string
var ticketsConfirmationTmplText *template.Template

//go:embed mails/html/event-broadcast-message.tmpl.html
var eventBroadcastMessageTmplHTMLSrc string
var eventBroadcastMessageTmplHTML *template.Template

//go:embed mails/text/event-broadcast-message.tmpl.txt
var eventBroadcastMessageTmplTextSrc string
var eventBroadcastMessageTmplText *template.Template

//go:embed mails/html/community-new-event.tmpl.html
var communityNewEventTmplHTMLSrc string
var communityNewEventTmplHTML *template.Template

//go:embed mails/text/community-new-event.tmpl.txt
var communityNewEventTmplTextSrc string
var communityNewEventTmplText *template.Template

//go:embed mails/html/event-cancelled.tmpl.html
var eventCancelledTmplHTMLSrc string
var eventCancelledTmplHTML *template.Template

//go:embed mails/text/event-cancelled.tmpl.txt
var eventCancelledTmplTextSrc string
var eventCancelledTmplText *template.Template

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

	tmpl, err = template.New("eventBroadcastMessageHTML").Parse(eventBroadcastMessageTmplHTMLSrc)
	if err != nil {
		panic(err)
	}
	eventBroadcastMessageTmplHTML = tmpl

	tmpl, err = template.New("eventBroadcastMessageText").Parse(eventBroadcastMessageTmplTextSrc)
	if err != nil {
		panic(err)
	}
	eventBroadcastMessageTmplText = tmpl

	tmpl, err = template.New("communityNewEventHTML").Parse(communityNewEventTmplHTMLSrc)
	if err != nil {
		panic(err)
	}
	communityNewEventTmplHTML = tmpl

	tmpl, err = template.New("communityNewEventText").Parse(communityNewEventTmplTextSrc)
	if err != nil {
		panic(err)
	}
	communityNewEventTmplText = tmpl
	tmpl, err = template.New("eventCancelledHTML").Parse(eventCancelledTmplHTMLSrc)
	if err != nil {
		panic(err)
	}
	eventCancelledTmplHTML = tmpl

	tmpl, err = template.New("eventCancelledText").Parse(eventCancelledTmplTextSrc)
	if err != nil {
		panic(err)
	}
	eventCancelledTmplText = tmpl
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

func ticketsConfirmationMailContent(evtID string, event *zenaov1.EventInfo, welcomeText string) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := zeni.EventTimezone(event.Location)
	if err != nil {
		return "", "", err
	}
	data := ticketsConfirmation{
		ImageURL:        web2URL(event.ImageUri) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		CalendarIconURL: web2URL("ipfs://bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa"),
		PinIconURL:      web2URL("ipfs://bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa"),
		EventName:       event.Title,
		TimeText:        time.Unix(int64(event.StartDate), 0).In(tz).Format(time.ANSIC) + " - " + time.Unix(int64(event.EndDate), 0).In(tz).Format(time.ANSIC),
		LocationText:    locStr,
		EventURL:        eventPublicURL(evtID),
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

type eventBroadcast struct {
	EventName string
	ImageURL  string
	Message   string
	EventURL  string
}

func eventBroadcastMailContent(evtID string, event *zenaov1.EventInfo, message string) (string, string, error) {
	data := eventBroadcast{
		ImageURL:  web2URL(event.ImageUri) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		EventName: event.Title,
		Message:   message,
		EventURL:  eventPublicURL(evtID),
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

func communityNewEventMailContent(evtID string, event *zenaov1.EventInfo, cmtID string, community *zenaov1.CommunityInfo) (string, string, error) {
	data := communityNewEvent{
		EventName:       event.Title,
		EventImage:      web2URL(event.ImageUri) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		EventDate:       time.Unix(int64(event.StartDate), 0).In(time.UTC).Format(time.ANSIC),
		EventEndDate:    time.Unix(int64(event.EndDate), 0).In(time.UTC).Format(time.ANSIC),
		EventURL:        eventPublicURL(evtID),
		CommunityName:   community.DisplayName,
		CommunityImage:  web2URL(community.AvatarUri) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
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

func eventCancelledMailContent(event *zenaov1.EventInfo) (string, string, error) {
	locStr, err := zeni.LocationToString(event.Location)
	if err != nil {
		return "", "", err
	}
	tz, err := zeni.EventTimezone(event.Location)
	if err != nil {
		return "", "", err
	}

	data := eventCancelled{
		ImageURL:        web2URL(event.ImageUri) + "?img-width=960&img-height=540&img-fit=cover&dpr=2",
		EventName:       event.Title,
		EventStartDate:  time.Unix(int64(event.StartDate), 0).In(tz).Format(time.ANSIC),
		EventEndDate:    time.Unix(int64(event.EndDate), 0).In(tz).Format(time.ANSIC),
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
