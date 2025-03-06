package social_feed

import (
	"gno.land/p/demo/mux"
	"gno.land/p/moul/md"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

var router *mux.Router

const SocialFeedPagePath = ""
const DetailSocialFeedPagePath = "{id}"

func init() {
	router = mux.NewRouter()
	router.HandleFunc(SocialFeedPagePath, SocialFeedPageHandler)
	router.HandleFunc(DetailSocialFeedPagePath, DetailSocialFeedPageHandler)
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
	posts.Iterate(start, end, func(key string, postRaw interface{}) bool {
		post := postRaw.(*zenaov1.Post)
		res.Write(renderZenaoPost(post))
		if i >= 20 {
			return true
		}
		res.Write(md.HorizontalRule())
		i++
		return false
	})
}

func renderZenaoPost(post *zenaov1.Post) string {
	switch t := post.Post.(type) {
	case *zenaov1.StandardPost:
		return renderStandardPost(t)
	case *zenaov1.ArticlePost:
		return renderArticlePost(t)
	case *zenaov1.LinkPost:
		return renderLinkPost(t)
	case *zenaov1.ImagePost:
		return renderImagePost(t)
	case *zenaov1.VideoPost:
		return renderVideoPost(t)
	default:
		return md.Paragraph("Unknown post type")
	}
}

func renderStandardPost(post *zenaov1.StandardPost) string {
	common := post.Common
	return md.H3("POST KIND: STANDARD") + md.Paragraph(post.Content) + md.Paragraph(md.Blockquote("Author: "+common.Author))
}

func renderArticlePost(post *zenaov1.ArticlePost) string {
	common := post.Common
	return md.H3("POST KIND: ARTICLE") + md.H3(post.Title) + md.Paragraph(post.PreviewText) + md.Image("article preview", post.PreviewImageUri) + md.Paragraph(post.Content) + md.Paragraph(md.Blockquote("Author: "+common.Author))
}

func renderLinkPost(post *zenaov1.LinkPost) string {
	common := post.Common
	return md.H3("POST KIND: LINK") + md.Link(post.Uri, post.Uri) + md.Paragraph(md.Blockquote("Author: "+common.Author))
}

func renderImagePost(post *zenaov1.ImagePost) string {
	common := post.Common
	return md.H3("POST KIND: IMAGE") + md.Image("image", post.ImageUri) + md.Paragraph(post.Description) + md.Paragraph(md.Blockquote("Author: "+common.Author))
}

func renderVideoPost(post *zenaov1.VideoPost) string {
	common := post.Common
	return md.H3("POST KIND: VIDEO") + md.Link(post.VideoUri, post.VideoUri) + md.Image("video thumbnail", post.ThumbnailImageUri) + md.Paragraph(post.Description) + md.Paragraph(md.Blockquote("Author: "+common.Author))
}
