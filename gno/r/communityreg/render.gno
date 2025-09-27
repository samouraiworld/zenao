package communityreg

import (
	"std"
	"strings"

	"gno.land/p/moul/md"
	"gno.land/p/nt/ufmt"
	zenaov1 "gno.land/p/zenao/zenao/v1"
	"gno.land/r/demo/profile"
)

// TODO: enhance rendering with pagination, search, etc.
func Render(path string) string {
	buf := strings.Builder{}
	buf.WriteString(md.H1("Zenao Communities"))
	buf.WriteString(md.HorizontalRule())
	listFn := listCommunities
	renderSection(&buf, listFn, 10, 0)

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
	var admRendered []string
	for _, adm := range community.Administrators {
		admin := profile.GetStringField(std.Address(adm), "DisplayName", "")
		if adm == "" {
			admin = adm
		}
		admRendered = append(admRendered, admin)
	}

	buf.WriteString(md.H3(community.DisplayName))
	buf.WriteString(md.Paragraph(community.Description))
	buf.WriteString(md.Paragraph("Members: " + ufmt.Sprintf("%d", community.CountMembers)))
	buf.WriteString(md.Paragraph(md.Link("🔗 View Community", trimDomain(community.PkgPath))))
	buf.WriteString(md.Paragraph("Administrators: "))
	buf.WriteString(md.BulletList(admRendered))
	buf.WriteString(md.HorizontalRule())
}

func trimDomain(pkgPath string) string {
	slashIdx := strings.Index(pkgPath, "/")
	if slashIdx == -1 {
		return pkgPath
	}
	return pkgPath[slashIdx:]
}
