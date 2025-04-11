package social_feed

import (
	"gno.land/p/demo/mux"
	"gno.land/p/moul/md"

	feedsv1 "gno.land/p/zenao/feeds/v1"
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
	postsByFeed.Iterate(start, end, func(key string, postRaw interface{}) bool {
		post := postRaw.(*feedsv1.Post)
		res.Write(renderZenaoPost(post))
		if i >= 20 {
			return true
		}
		res.Write(md.HorizontalRule())
		i++
		return false
	})
}

func renderZenaoPost(post *feedsv1.Post) string {
	switch ext := post.Post.(type) {
	case *feedsv1.StandardPost:
		return renderStandardPost(post, ext)
	case *feedsv1.ArticlePost:
		return renderArticlePost(post, ext)
	case *feedsv1.LinkPost:
		return renderLinkPost(post, ext)
	case *feedsv1.ImagePost:
		return renderImagePost(post, ext)
	case *feedsv1.VideoPost:
		return renderVideoPost(post, ext)
	default:
		return md.Paragraph("Unknown post type")
	}
}

func renderStandardPost(post *feedsv1.Post, ext *feedsv1.StandardPost) string {
	return md.H3("POST KIND: STANDARD") + md.Paragraph(ext.Content) + md.Paragraph(md.Blockquote("Author: "+post.Author))
}

func renderArticlePost(post *feedsv1.Post, ext *feedsv1.ArticlePost) string {
	return md.H3("POST KIND: ARTICLE") + md.H3(ext.Title) + md.Paragraph(ext.PreviewText) + md.Image("article preview", ext.PreviewImageUri) + md.Paragraph(ext.Content) + md.Paragraph(md.Blockquote("Author: "+post.Author))
}

func renderLinkPost(post *feedsv1.Post, ext *feedsv1.LinkPost) string {
	return md.H3("POST KIND: LINK") + md.Link(ext.Uri, ext.Uri) + md.Paragraph(md.Blockquote("Author: "+post.Author))
}

func renderImagePost(post *feedsv1.Post, ext *feedsv1.ImagePost) string {
	return md.H3("POST KIND: IMAGE") + md.Image("image", ext.ImageUri) + md.Paragraph(ext.Description) + md.Paragraph(md.Blockquote("Author: "+post.Author))
}

func renderVideoPost(post *feedsv1.Post, ext *feedsv1.VideoPost) string {
	return md.H3("POST KIND: VIDEO") + md.Link(ext.VideoUri, ext.VideoUri) + md.Image("video thumbnail", ext.ThumbnailImageUri) + md.Paragraph(ext.Description) + md.Paragraph(md.Blockquote("Author: "+post.Author))
}
