package eventreg

import (
	"math"
	"strings"
	"time"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
)

func Render(path string) string {
	buf := strings.Builder{}
	buf.WriteString(md.H1("Zenao Events"))
	renderSection(&buf, "Upcoming", time.Now().Unix(), math.MaxInt64, 10)
	renderSection(&buf, "Past", math.MinInt64, time.Now().Unix(), 10)
	return buf.String()
}

func renderSection(buf *strings.Builder, title string, from int64, to int64, limit uint32) {
	buf.WriteString(md.H2(title))
	upcoming := listEvents(from, to, limit)
	for _, evt := range upcoming {
		md.HorizontalRule()
		renderEvent(buf, evt)
	}
	if len(upcoming) != 0 {
		buf.WriteString(md.HorizontalRule())
	}
}

func renderEvent(buf *strings.Builder, evt *InfoWithPkgPath) {
	buf.WriteString(md.H3(evt.Title))
	buf.WriteString(md.Paragraph(ufmt.Sprintf("From %s to %s", time.Unix(evt.StartDate, 0).Format(time.DateTime), time.Unix(evt.EndDate, 0).Format(time.DateTime))))
	buf.WriteString(md.Link("🔗 Details", ufmt.Sprintf("/%s", trimDomain(evt.PkgPath))))
}

func trimDomain(pkgPath string) string {
	slashIdx := strings.Index(pkgPath, "/")
	if slashIdx == -1 {
		return pkgPath
	}
	return pkgPath[slashIdx+1:]
}
