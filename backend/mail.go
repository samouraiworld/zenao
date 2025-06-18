package main

import (
	"context"
	_ "embed"
	"fmt"
	"strings"
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

	str, _, err := ticketsConfirmationMailContent(evt, "Welcome! Tickets will be sent in a few weeks!")
	if err != nil {
		return err
	}

	fmt.Println(str)

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
