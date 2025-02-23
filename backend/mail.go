package main

import (
	"context"
	_ "embed"
	"fmt"
	"strings"
	"text/template"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

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
		ImageURI:  "https://zenao.io/_next/image?url=https%3A%2F%2Fimgs.search.brave.com%2F5GwuXHbuGn4ocbCeYZqLXg7O51PF5gBNx4maJd1OE0k%2Frs%3Afit%3A500%3A0%3A0%3A0%2Fg%3Ace%2FaHR0cHM6Ly9jZG4u%2FcGl4YWJheS5jb20v%2FcGhvdG8vMjAyMy8w%2FOC8xNS8xMC8yMy9w%2FcmV0dHktODE5MTY3%2FOV82NDAucG5n&w=750&q=75",
		Title:     "GET IN STEP: n0izn0iz + zooma + pwnh4",
		StartDate: time.Now().Add(time.Hour * 24),
		EndDate:   time.Now().Add(time.Hour * 30),
		Location: &zenaov1.EventLocation{Address: &zenaov1.EventLocation_Custom{Custom: &zenaov1.AddressCustom{
			Address:  "Ground Control",
			Timezone: "Europe/Paris",
		}}},
	}
	evt.ID = "10"

	str, err := generateConfirmationMailHTML(evt)
	if err != nil {
		return err
	}

	fmt.Println(str)

	return nil
}

//go:embed confirmation-mail.tmpl.html
var confirmationTemplate string

func generateConfirmationMailHTML(evt *zeni.Event) (string, error) {
	t, err := template.New("").Parse(confirmationTemplate)
	if err != nil {
		return "", err
	}
	tz, err := evt.Timezone()
	if err != nil {
		return "", err
	}
	locStr, err := zeni.LocationToString(evt.Location)
	if err != nil {
		return "", err
	}
	// XXX: think about injections
	m := map[string]interface{}{
		"eventImageURL": web2URL(evt.ImageURI),
		"eventName":     evt.Title,
		"dateTime":      fmt.Sprintf("%s - %s", evt.StartDate.In(tz).Format(time.UnixDate), evt.EndDate.In(tz).Format(time.UnixDate)),
		"address":       locStr,
		"eventURL":      eventPublicURL(evt.ID),
	}
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func generateConfirmationMailText(evt *zeni.Event) (string, error) {
	locStr, err := zeni.LocationToString(evt.Location)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`Welcome! Tickets will be sent in a few weeks!

--------------------------------------------------------------------------------

Event name: %s
Date and time: %s - %s
Address: %s

--------------------------------------------------------------------------------

See on Zenao: %s
`, evt.Title, evt.StartDate.Format(time.UnixDate), evt.EndDate.Format(time.UnixDate), locStr, eventPublicURL(evt.ID)), nil
}

//go:embed create-event-mail.tmpl.html
var creationConfirmationTemplate string

func generateCreationConfirmationMailHTML(evt *zeni.Event) (string, error) {
	t, err := template.New("").Parse(creationConfirmationTemplate)
	if err != nil {
		return "", err
	}
	tz, err := evt.Timezone()
	if err != nil {
		return "", err
	}
	locStr, err := zeni.LocationToString(evt.Location)
	if err != nil {
		return "", err
	}
	// XXX: think about injections
	m := map[string]interface{}{
		"eventImageURL": web2URL(evt.ImageURI),
		"eventName":     evt.Title,
		"dateTime":      fmt.Sprintf("%s - %s", evt.StartDate.In(tz).Format(time.UnixDate), evt.EndDate.In(tz).Format(time.UnixDate)),
		"address":       locStr,
		"eventURL":      eventPublicURL(evt.ID),
	}
	buf := strings.Builder{}
	if err := t.Execute(&buf, m); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func generateCreationConfirmationMailText(evt *zeni.Event) (string, error) {
	locStr, err := zeni.LocationToString(evt.Location)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`Event created!

--------------------------------------------------------------------------------

Event name: %s
Date and time: %s - %s
Address: %s

--------------------------------------------------------------------------------

See on Zenao: %s
`, evt.Title, evt.StartDate.Format(time.UnixDate), evt.EndDate.Format(time.UnixDate), locStr, eventPublicURL(evt.ID)), nil
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

const gatewayDomain = `rose-many-bass-859.mypinata.cloud`
