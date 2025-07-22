package communityreg

import (
	"strings"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

// TODO: enhance rendering with pagination, search, etc.
func Render(path string) string {
	buf := strings.Builder{}
	buf.WriteString(md.H1("Zenao Communities"))
	buf.WriteString(md.HorizontalRule())
	listFn := listCommunities
	renderSection(&buf, listFn, 0, 10)

	return buf.String()
}

func renderSection(buf *strings.Builder, listFn func(uint32, uint32) []*zenaov1.CommunityInfo, offset uint32, limit uint32) {
	buf.WriteString(md.H2("Communities"))
	communities := listFn(offset, limit)
	for _, community := range communities {
		buf.WriteString(md.HorizontalRule())
		renderCommunity(buf, community)
	}
	if len(communities) == 0 {
		buf.WriteString(md.HorizontalRule())
		buf.WriteString(md.Paragraph("🤷 Nothing to show"))
	}
	buf.WriteString(md.HorizontalRule())
}

func renderCommunity(buf *strings.Builder, community *zenaov1.CommunityInfo) {
	buf.WriteString(md.H3(community.DisplayName))
	buf.WriteString(md.Paragraph(community.Description))
	buf.WriteString(md.Paragraph("Creator: " + community.Creator))
	buf.WriteString(md.Paragraph("Members: " + ufmt.Sprintf("%d", community.CountMembers)))
	buf.WriteString(md.Link("🔗 View Community", trimDomain(community.PkgPath)))
	buf.WriteString(md.HorizontalRule())
}

func trimDomain(pkgPath string) string {
	slashIdx := strings.Index(pkgPath, "/")
	if slashIdx == -1 {
		return pkgPath
	}
	return pkgPath[slashIdx:]
}
