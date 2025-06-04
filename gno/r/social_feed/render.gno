package social_feed

import (
	"std"
	"strconv"
	"strings"

	"gno.land/p/demo/mux"
	"gno.land/p/demo/seqid"
	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
	ma "gno.land/p/zenao/multiaddr"

	feedsv1 "gno.land/p/zenao/feeds/v1"
)

var router *mux.Router

const SocialFeedPagePath = ""
const DetailSocialFeedPagePath = "{id}"
const DetailPostPagePath = "post/{postId}"

func init() {
	router = mux.NewRouter()
	router.HandleFunc(SocialFeedPagePath, SocialFeedPageHandler)
	router.HandleFunc(DetailSocialFeedPagePath, DetailSocialFeedPageHandler)
	router.HandleFunc(DetailPostPagePath, DetailPostPageHandler)
}

func Render(path string) string {
	return router.Render(path)
}

func SocialFeedPageHandler(res *mux.ResponseWriter, req *mux.Request) {
	res.Write(md.H1("Welcome to the social feed factory 🏭"))
	res.Write(md.Paragraph("A social feed does not need to be created explicitly, but have to if you want to add auth layer."))
	res.Write(md.Paragraph("Here are the 20 first social feeds:"))
	i := 0
	feeds.Iterate("", "", func(key string, feedRaw interface{}) bool {
		res.Write(md.BulletItem(md.Link(key, "social_feed:"+key)))
		i++
		if i >= 20 {
			return true
		}
		return false
	})
	res.Write(md.Blockquote("You can see any feed by adding :id to the URL"))
}

func DetailSocialFeedPageHandler(res *mux.ResponseWriter, req *mux.Request) {
	id := req.GetVar("id")
	feedRaw, ok := feeds.Get(id)
	if !ok {
		res.Write(md.H1("Feed not found"))
		return
	}
	feed := feedRaw.(*Feed)
	res.Write(md.H1(id))
	if feed.crossNetwork {
		res.Write(md.Paragraph("Cross network feed ✅"))
	} else {
		res.Write(md.Paragraph("Local feed ✅"))
	}
	if feed.authFunc != nil {
		res.Write(md.Paragraph("This feed is private 🔒"))
	} else {
		res.Write(md.Paragraph("This feed is public 🔓"))
	}
	res.Write(md.Paragraph(md.Bold("Posts:")))
	res.Write(md.HorizontalRule())
	i := 0
	start := id + ":"
	end := id + ";"
	postsByFeed.ReverseIterate(start, end, func(key string, postRaw interface{}) bool {
		post := postRaw.(*feedsv1.Post)
		if post.ParentUri != "" {
			return false
		}
		res.Write(renderZenaoPost(post))
		if i >= 20 {
			return true
		}
		res.Write(md.HorizontalRule())
		i++
		return false
	})
}

func DetailPostPageHandler(res *mux.ResponseWriter, req *mux.Request) {
	postId := req.GetVar("postId")
	postRaw, ok := posts.Get(postId)
	if !ok {
		res.Write(md.H1("Post not found"))
		return
	}
	post := postRaw.(*feedsv1.Post)
	res.Write(md.H1(ufmt.Sprintf("Post #%d", post.LocalPostId)))
	res.Write(renderZenaoPost(post))
	res.Write(md.H2("Comments:"))
	res.Write(md.HorizontalRule())
	comments := GetChildrenPosts(ufmt.Sprintf("%d", post.LocalPostId), 0, 20, "", "")
	for _, comment := range comments {
		res.Write(renderZenaoPost(comment.Post))
		res.Write(md.HorizontalRule())
	}
}

func renderZenaoPost(post *feedsv1.Post) string {
	pkgPath := std.CurrentRealm().PkgPath()
	linkPath := getLinkPath(pkgPath)
	var s string
	switch ext := post.Post.(type) {
	case *feedsv1.StandardPost:
		s = renderStandardPost(ext)
	case *feedsv1.ArticlePost:
		s = renderArticlePost(ext)
	case *feedsv1.LinkPost:
		s = renderLinkPost(ext)
	case *feedsv1.ImagePost:
		s = renderImagePost(ext)
	case *feedsv1.VideoPost:
		s = renderVideoPost(ext)
	default:
		s = md.Paragraph("Unknown post type")
	}
	s += md.Paragraph(md.Blockquote("Author: " + post.Author))
	s += md.Link("See details", linkPath+":post/"+seqid.ID(post.LocalPostId).String())
	commentCount := CountChildren(post.LocalPostId)
	s += md.Paragraph("NUMBER OF COMMENTS: " + ufmt.Sprintf("%d", commentCount) + " " + md.Link("see comments", linkPath+":post/"+seqid.ID(post.LocalPostId).String()))
	reactions := GetPostReactions(post.LocalPostId, "")
	s += md.Paragraph("NUMBER OF REACTIONS: " + ufmt.Sprintf("%d", len(reactions)))
	if len(reactions) > 0 {
		s += md.Paragraph("Reactions:")
		for _, reaction := range reactions {
			s += md.BulletItem(reaction.Icon + ": " + md.Bold(ufmt.Sprintf("%d", reaction.Count)))
		}
	}

	return s
}

func renderStandardPost(ext *feedsv1.StandardPost) string {
	return md.H3("POST KIND: STANDARD") + md.Paragraph(ext.Content)
}

func renderArticlePost(ext *feedsv1.ArticlePost) string {
	return md.H3("POST KIND: ARTICLE") + md.H3(ext.Title) + md.Paragraph(ext.PreviewText) + md.Image("article preview", ext.PreviewImageUri) + md.Paragraph(ext.Content)
}

func renderLinkPost(ext *feedsv1.LinkPost) string {
	// use %3A to encode the : and avoid to be interpreted as a protocol (mailto, tel, etc...)
	return md.H3("POST KIND: LINK") + md.Link(ext.Uri, handleMultiaddrLink(ext.Uri))
}

func renderImagePost(ext *feedsv1.ImagePost) string {
	return md.H3("POST KIND: IMAGE") + md.Image("image", ext.ImageUri) + md.Paragraph(ext.Description)
}

func renderVideoPost(ext *feedsv1.VideoPost) string {
	return md.H3("POST KIND: VIDEO") + md.Link(ext.VideoUri, ext.VideoUri) + md.Image("video thumbnail", ext.ThumbnailImageUri) + md.Paragraph(ext.Description)
}

// XXX: adapt it to many different protocols later (not fan on this could be rework when we defined final protocols)
func handleMultiaddrLink(link string) string {
	ma, err := ma.NewMultiaddr(Protocols, link)
	if err != nil {
		return ""
	}
	p, err := Protocols.ProtocolWithName("gno")
	if err != nil {
		return ""
	}
	gnoPath, err := ma.ValueForProtocol(p.Code)
	if err != nil {
		return ""
	}
	poll, err := Protocols.ProtocolWithName("poll")
	if err != nil {
		return ""
	}
	pollID, err := ma.ValueForProtocol(poll.Code)
	if err != nil {
		return ""
	}
	pollIDint, err := strconv.ParseInt(pollID, 10, 64)
	if err != nil {
		return ""
	}
	slashIdx := strings.LastIndex(gnoPath, "/")
	if slashIdx == -1 {
		return ""
	}
	return "./" + gnoPath[slashIdx+1:] + ":" + seqid.ID(pollIDint).String()
}

func getLinkPath(pkgPath string) string {
	slashIdx := strings.IndexRune(pkgPath, '/')
	if slashIdx != 1 {
		return pkgPath[slashIdx:]
	}
	return ""
}
