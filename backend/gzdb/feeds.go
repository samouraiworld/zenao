package gzdb

import (
	"encoding/json"
	"fmt"
	"strconv"

	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

const (
	PostTypeStandard = "standard"
	PostTypeArticle  = "article"
	PostTypeLink     = "link"
	PostTypeImage    = "image"
	PostTypeVideo    = "video"
	PostTypeAudio    = "audio"
)

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

type Poll struct {
	gorm.Model
	Question string
	Kind     int
	Duration int64

	PostID uint
	Post   Post

	Results []PollResult
}

type PollResult struct {
	gorm.Model
	Option string
	PollID uint
	Poll   Poll
	Users  []User `gorm:"many2many:poll_votes;"`
}

func dbFeedToZeniFeed(feed *Feed) (*zeni.Feed, error) {
	return &zeni.Feed{
		ID:      strconv.FormatUint(uint64(feed.ID), 10),
		Slug:    feed.Slug,
		EventID: strconv.FormatUint(uint64(feed.EventID), 10),
	}, nil
}

func dbPostToZeniPost(post *Post) (*zeni.Post, error) {
	var tags []string
	err := json.Unmarshal([]byte(post.Tags), &tags)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
	}

	zpost := &zeni.Post{
		ID: strconv.FormatUint(uint64(post.ID), 10),
		Post: &feedsv1.Post{
			//TODO: fill author
			CreatedAt: post.CreatedAt.Unix(),
			UpdatedAt: post.UpdatedAt.Unix(),
			DeletedAt: post.DeletedAt.Time.Unix(),
			Loc: &feedsv1.PostGeoLoc{
				Lat: post.Latitude,
				Lng: post.Longitude,
			},
			Tags: tags,
		},
	}

	switch post.Kind {
	case PostTypeStandard:
		zpost.Post.Post = &feedsv1.Post_Standard{
			Standard: &feedsv1.StandardPost{
				Content: post.Content,
			},
		}
	case PostTypeArticle:
		zpost.Post.Post = &feedsv1.Post_Article{
			Article: &feedsv1.ArticlePost{
				Title:   post.Title,
				Content: post.Content,
			},
		}
	case PostTypeLink:
		zpost.Post.Post = &feedsv1.Post_Link{
			Link: &feedsv1.LinkPost{
				Uri: post.URI,
			},
		}
	case PostTypeImage:
		zpost.Post.Post = &feedsv1.Post_Image{
			Image: &feedsv1.ImagePost{
				Title:       post.Title,
				Description: post.Description,
				ImageUri:    post.ImageURI,
			},
		}
	case PostTypeVideo:
		zpost.Post.Post = &feedsv1.Post_Video{
			Video: &feedsv1.VideoPost{
				Description:       post.Description,
				VideoUri:          post.VideoURI,
				ThumbnailImageUri: post.ThumbnailImageURI,
			},
		}
	case PostTypeAudio:
		zpost.Post.Post = &feedsv1.Post_Audio{
			Audio: &feedsv1.AudioPost{
				Title:       post.Title,
				Description: post.Description,
				AudioUri:    post.AudioURI,
				ImageUri:    post.ThumbnailImageURI,
			},
		}
	default:
		return nil, fmt.Errorf("unknown post kind: %s", post.Kind)
	}

	return zpost, nil
}

func dbPollToZeniPoll(poll *Poll) (*zeni.Poll, error) {
	kind := pollsv1.PollKind(poll.Kind)
	zpoll := &zeni.Poll{
		ID:       strconv.FormatUint(uint64(poll.ID), 10),
		Question: poll.Question,
		Kind:     &kind,
		Duration: poll.Duration,
		Results:  []*pollsv1.PollResult{},
	}

	for _, result := range poll.Results {
		zpoll.Results = append(zpoll.Results, &pollsv1.PollResult{
			Option:       result.Option,
			Count:        uint32(len(result.Users)),
			HasUserVoted: false, // TODO: check if user has voted
		})
	}

	return zpoll, nil
}
