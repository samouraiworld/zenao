package main

import (
	"context"
	_ "embed"
	"fmt"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func newRealmsrcCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "realmsrc",
			ShortUsage: "realmsrc",
			ShortHelp:  "generate a fake event realm soure",
		},
		commands.NewEmptyConfig(),
		func(ctx context.Context, args []string) error {
			return execRealmsrc()
		},
	)
}

func execRealmsrc() error {
	str, err := genEventRealmSource([]string{"0xAddr"}, []string{}, "0xZenaoAdminAddr", "zenao", &zenaov1.CreateEventRequest{
		ImageUri:  "https://zenao.io/_next/image?url=https%3A%2F%2Fimgs.search.brave.com%2F5GwuXHbuGn4ocbCeYZqLXg7O51PF5gBNx4maJd1OE0k%2Frs%3Afit%3A500%3A0%3A0%3A0%2Fg%3Ace%2FaHR0cHM6Ly9jZG4u%2FcGl4YWJheS5jb20v%2FcGhvdG8vMjAyMy8w%2FOC8xNS8xMC8yMy9w%2FcmV0dHktODE5MTY3%2FOV82NDAucG5n&w=750&q=75",
		Title:     "GET IN STEP: n0izn0iz + zooma + pwnh4",
		StartDate: uint64(time.Now().Add(time.Hour * 24).Unix()),
		EndDate:   uint64(time.Now().Add(time.Hour * 30).Unix()),
		Location: &zenaov1.EventLocation{Address: &zenaov1.EventLocation_Custom{Custom: &zenaov1.AddressCustom{
			Address:  "Ground Control",
			Timezone: "Europe/Paris",
		}}},
	}, &zenaov1.EventPrivacy{EventPrivacy: &zenaov1.EventPrivacy_Public{Public: &zenaov1.EventPrivacyPublic{}}})

	fmt.Println(str)

	return err
}
