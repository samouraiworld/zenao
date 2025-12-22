package gzdb

import (
	"fmt"
	"strconv"
	"time"

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

	OrgType string // one of: user, event, community
	OrgID   uint
}

type Tag struct {
	PostID uint   `gorm:"primaryKey"`
	Name   string `gorm:"primaryKey"`
	Post   Post
}

// XXX: can optimize high volume read performance with reaction_count table
type Reaction struct {
	gorm.Model
	Icon   string
	PostID uint
	Post   Post
	UserID uint
	User   User
}

type Post struct {
	gorm.Model
	Kind      string
	ParentURI string

	Latitude  float32
	Longitude float32

	Tags      []Tag      `gorm:"foreignKey:PostID"`
	Reactions []Reaction `gorm:"foreignKey:PostID"`

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

	PinnedAt *time.Time // use time zero value to indicate not pinned

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

	PostID uint //XXX: should make it unique
	Post   Post

	Results []PollResult
}

type PollResult struct {
	gorm.Model
	Option string
	PollID uint
	Poll   Poll
	Votes  []PollVote
}

type PollVote struct {
	PollResultID uint      `gorm:"primaryKey"`
	UserID       uint      `gorm:"primaryKey"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`

	PollResult PollResult `gorm:"foreignKey:PollResultID"`
	User       User       `gorm:"foreignKey:UserID"`
}

func dbFeedToZeniFeed(feed *Feed) (*zeni.Feed, error) {
	return &zeni.Feed{
		ID:        strconv.FormatUint(uint64(feed.ID), 10),
		CreatedAt: feed.CreatedAt,
		Slug:      feed.Slug,
		OrgType:   feed.OrgType,
		OrgID:     strconv.FormatUint(uint64(feed.OrgID), 10),
	}, nil
}

func dbPostToZeniPost(post *Post) (*zeni.Post, error) {
	var tags []string
	for _, tag := range post.Tags {
		tags = append(tags, tag.Name)
	}

	var reactions []*zeni.Reaction
	for _, reaction := range post.Reactions {
		reactions = append(reactions, &zeni.Reaction{
			ID:        strconv.FormatUint(uint64(reaction.ID), 10),
			CreatedAt: reaction.CreatedAt,
			PostID:    strconv.FormatUint(uint64(post.ID), 10),
			UserID:    strconv.FormatUint(uint64(reaction.UserID), 10),
			Icon:      reaction.Icon,
		})
	}

	// on null value, Unix() returns negative value
	deletedAt := int64(0)
	if post.DeletedAt.Valid {
		deletedAt = post.DeletedAt.Time.Unix()
	}
	zpost := &zeni.Post{
		ID:        strconv.FormatUint(uint64(post.ID), 10),
		CreatedAt: post.CreatedAt,
		UserID:    strconv.FormatUint(uint64(post.UserID), 10),
		FeedID:    strconv.FormatUint(uint64(post.FeedID), 10),
		Post: &feedsv1.Post{
			// Need to convert this to chain address later.
			// Using two-step process: first store the ID here,
			// then in the controller retrieve and set the actual address.
			LocalPostId: uint64(post.ID),
			Author:      fmt.Sprintf("%d", post.UserID),
			ParentUri:   post.ParentURI,

			CreatedAt: post.CreatedAt.Unix(),
			UpdatedAt: post.UpdatedAt.Unix(),
			DeletedAt: deletedAt,
			Loc:       nil,
			Tags:      tags,
		},
		Reactions: reactions,
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

func dbPollToZeniPoll(poll *Poll, userID string) (*zeni.Poll, error) {
	kind := pollsv1.PollKind(poll.Kind)
	zpoll := &zeni.Poll{
		ID:        strconv.FormatUint(uint64(poll.ID), 10),
		CreatedAt: poll.CreatedAt,
		Question:  poll.Question,
		Kind:      kind,
		Duration:  poll.Duration,
		PostID:    strconv.FormatUint(uint64(poll.PostID), 10),
		Results:   []*pollsv1.PollResult{},
	}

	var votes []*zeni.Vote
	for _, result := range poll.Results {
		res := &pollsv1.PollResult{
			Option: result.Option,
			Count:  uint32(len(result.Votes)),
		}
		for _, vote := range result.Votes {
			votes = append(votes, &zeni.Vote{
				CreatedAt: vote.CreatedAt,
				UserID:    strconv.FormatUint(uint64(vote.UserID), 10),
				Option:    result.Option,
			})
			if userID != "" && strconv.FormatUint(uint64(vote.UserID), 10) == userID {
				res.HasUserVoted = true
			}
		}
		zpoll.Results = append(zpoll.Results, res)
	}
	zpoll.Votes = votes

	return zpoll, nil
}
