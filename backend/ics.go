package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

const icsDateTime = "20060102T150405Z"

// see: https://datatracker.ietf.org/doc/html/rfc5545
func GenerateICS(event *zeni.Event, start time.Time, end time.Time, zenaoEmail string, logger *zap.Logger) []byte {
	uid := fmt.Sprintf("evt_%s@zenao.io", event.ID)
	summary := formatICSText(event.Title)
	dtstamp := time.Now().UTC().Format(icsDateTime)
	dtstart := start.Format(icsDateTime)
	dtend := end.Format(icsDateTime)
	eventURL := fmt.Sprintf("https://zenao.io/event/%s", event.ID)
	description := formatICSText(fmt.Sprintf("You are invited to %s!", event.Title))
	location, err := zeni.LocationToString(event.Location)
	if err != nil {
		logger.Error("failed to convert location to string", zap.Error(err), zap.String("event-id", event.ID))
		location = ""
	}
	location = formatICSText(location)
	organizerFormatted := fmt.Sprintf("CN=Zenao:mailto:%s", zenaoEmail)

	// XXX: save event edit history in the database to track sequence number
	ics := fmt.Sprintf(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Zenao//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:%s
DTSTAMP:%s
SUMMARY:%s
DESCRIPTION:%s
DTSTART:%s
DTEND:%s
URL:%s
LOCATION:%s
ORGANIZER;%s
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`, uid, dtstamp, summary, description, dtstart, dtend, eventURL, location, organizerFormatted)
	return []byte(ics)
}

func formatICSText(input string) string {
	// see page 46 of the RFC 5545 for special characters
	replacer := strings.NewReplacer(
		"\\", "\\\\",
		";", `\;`,
		",", `\,`,
		"\n", `\n`,
		"\r", "",
	)
	escaped := replacer.Replace(input)

	var out strings.Builder
	var line strings.Builder
	lineLen := 0

	//XXX: we need to fold to 75 bytes per line including the CRLF + space
	for _, r := range escaped {
		runeStr := string(r)
		runeBytes := len(runeStr)
		if lineLen+runeBytes > 73 {
			out.WriteString(line.String() + "\r\n ")
			line.Reset()
			lineLen = 0
		}
		line.WriteString(runeStr)
		lineLen += runeBytes
	}
	out.WriteString(line.String())
	return out.String()
}
