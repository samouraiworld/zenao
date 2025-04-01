package gzdb

import "gorm.io/gorm"

type Feed struct {
	gorm.Model
	Slug string

	EventID uint
	Event   Event
}

type Post struct {
	gorm.Model
	Kind      string
	ParentURI string

	Latitude  float32
	Longitude float32

	Tags string // JSON array of tags

	// Content fields based on post type
	Content           string // StandardPost
	Title             string // ArticlePost, ImagePost, AudioPost
	PreviewText       string // ArticlePost
	PreviewImageURI   string // ArticlePost
	URI               string // LinkPost
	Description       string // ImagePost, AudioPost, VideoPost
	ImageURI          string // ImagePost, AudioPost
	AudioURI          string // AudioPost
	VideoURI          string // VideoPost
	ThumbnailImageURI string // VideoPost

	UserID uint
	User   User
	FeedID uint
	Feed   Feed
}
