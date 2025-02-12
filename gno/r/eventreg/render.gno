package eventreg

import (
	"errors"
	"math"
	"strings"
	"time"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	zenaov1 "gno.land/p/zenao/v1"
)

func Render(path string) string {
	title := "Zenao Events"
	listFn := listEvents
	switch {
	case strings.HasPrefix(path, "created/"):
		title = "My Zenao Events"
		listFn = func(from int64, to int64, limit uint32) []*zenaov1.EventInfo {
			return listEventsByCreator(strings.TrimPrefix(path, "created/"), from, to, limit)
		}
	case strings.HasPrefix(path, "tickets/"):
		title = "My Zenao Tickets"
		listFn = func(from int64, to int64, limit uint32) []*zenaov1.EventInfo {
			return listEventsByParticipant(strings.TrimPrefix(path, "tickets/"), from, to, limit)
		}
	}

	buf := strings.Builder{}
	buf.WriteString(md.H1(title))
	buf.WriteString(md.HorizontalRule())
	renderSection(&buf, listFn, "🎉 Upcoming", time.Now().Unix()+1, math.MaxInt64, 10)
	renderSection(&buf, listFn, "👴 Past", time.Now().Unix(), 0, 10)
	return buf.String()
}

func renderSection(buf *strings.Builder, listFn func(int64, int64, uint32) []*zenaov1.EventInfo, title string, from int64, to int64, limit uint32) {
	buf.WriteString(md.H2(title))
	evts := listFn(from, to, limit)
	for _, evt := range evts {
		buf.WriteString(md.HorizontalRule())
		renderEvent(buf, evt)
	}
	if len(evts) == 0 {
		buf.WriteString(md.HorizontalRule())
		buf.WriteString(md.Paragraph("🤷 Nothing to show"))
	}
	buf.WriteString(md.HorizontalRule())
}

func renderEvent(buf *strings.Builder, evt *zenaov1.EventInfo) {
	locStr, err := locationString(evt.Location)
	if err != nil {
		locStr = "Error: " + err.Error()
	}
	buf.WriteString(md.H3(evt.Title + " | 📍 " + locStr))
	timeStr := ufmt.Sprintf("⏱️ %s to %s", time.Unix(evt.StartDate, 0).Format(time.DateTime), time.Unix(evt.EndDate, 0).Format(time.DateTime))
	buf.WriteString(md.Paragraph(timeStr + " | " + md.Link("🔗 Details", trimDomain(evt.PkgPath))))
}

func trimDomain(pkgPath string) string {
	slashIdx := strings.Index(pkgPath, "/")
	if slashIdx == -1 {
		return pkgPath
	}
	return pkgPath[slashIdx:]
}

func locationString(location *zenaov1.EventLocation) (string, error) {
	if location == nil {
		return "", errors.New("nil location")
	}

	buf := &strings.Builder{}

	if location.VenueName != "" {
		buf.WriteString(location.VenueName)
		buf.WriteString(" - ")
	}

	switch val := location.Address.(type) {
	case *zenaov1.AddressVirtual:
		buf.WriteString(val.Uri)
	case *zenaov1.AddressGeo:
		buf.WriteString(val.Address)
		buf.WriteString(ufmt.Sprintf("- %g, %g", val.Lat, val.Lng))
	case *zenaov1.AddressCustom:
		buf.WriteString(val.Address)
	default:
		return "", errors.New("unsupported address type")
	}

	return buf.String(), nil
}
