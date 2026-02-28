package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	ma "github.com/multiformats/go-multiaddr"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	pollsv1 "github.com/samouraiworld/zenao/backend/polls/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

func (g *gormZenaoDB) GetOrgByPollID(pollID string) (orgType, orgID string, err error) {
	pollIDInt, err := strconv.ParseUint(pollID, 10, 64)
	if err != nil {
		return "", "", fmt.Errorf("parse poll id: %w", err)
	}

	var poll Poll
	if err := g.db.
		Preload("Post.Feed").
		First(&poll, pollIDInt).Error; err != nil {
		return "", "", fmt.Errorf("get poll by id %d: %w", pollIDInt, err)
	}

	return poll.Post.Feed.OrgType, strconv.FormatUint(uint64(poll.Post.Feed.OrgID), 10), nil
}

func (g *gormZenaoDB) GetOrgByPostID(postID string) (orgType, orgID string, err error) {
	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return "", "", fmt.Errorf("parse post id: %w", err)
	}

	var post Post
	if err := g.db.
		Preload("Feed").
		First(&post, postIDInt).Error; err != nil {
		return "", "", fmt.Errorf("get post by id %d: %w", postIDInt, err)
	}

	return post.Feed.OrgType, strconv.FormatUint(uint64(post.Feed.OrgID), 10), nil
}

// CreateFeed implements zeni.DB.
func (g *gormZenaoDB) CreateFeed(orgType string, orgID string, slug string) (*zeni.Feed, error) {
	orgIDInt, err := strconv.ParseUint(orgID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse org id: %w", err)
	}

	feed := &Feed{
		Slug:    slug,
		OrgType: orgType,
		OrgID:   uint(orgIDInt),
	}

	if err := g.db.Create(feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(feed)
	if err != nil {
		return nil, err
	}

	return zfeed, nil
}

// GetFeed implements zeni.DB.
func (g *gormZenaoDB) GetFeed(orgType string, orgID string, slug string) (*zeni.Feed, error) {
	orgIDint, err := strconv.ParseUint(orgID, 10, 64)
	if err != nil {
		return nil, err
	}

	var feed Feed
	if err := g.db.Where("org_type = ? AND org_id = ? AND slug = ?", orgType, orgIDint, slug).First(&feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(&feed)
	if err != nil {
		return nil, err
	}
	return zfeed, nil
}

// GetFeedByID implements zeni.DB.
func (g *gormZenaoDB) GetFeedByID(feedID string) (*zeni.Feed, error) {
	var feed Feed
	if err := g.db.Where("id = ?", feedID).First(&feed).Error; err != nil {
		return nil, err
	}

	zfeed, err := dbFeedToZeniFeed(&feed)
	if err != nil {
		return nil, err
	}
	return zfeed, nil
}

// CreatePost implements zeni.DB.
func (g *gormZenaoDB) CreatePost(feedID string, userID string, post *feedsv1.Post) (*zeni.Post, error) {
	feedIDInt, err := strconv.ParseUint(feedID, 10, 64)
	if err != nil {
		return nil, err
	}

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, err
	}

	var tags []Tag
	for _, tagName := range post.Tags {
		tags = append(tags, Tag{
			Name: tagName,
		})
	}

	dbPost := &Post{
		ParentURI: post.ParentUri,
		UserID:    uint(userIDInt),
		FeedID:    uint(feedIDInt),
		Tags:      tags,
	}

	switch v := post.Post.(type) {
	case *feedsv1.Post_Standard:
		dbPost.Kind = PostTypeStandard
		dbPost.Content = v.Standard.Content
	case *feedsv1.Post_Article:
		dbPost.Kind = PostTypeArticle
		dbPost.Title = v.Article.Title
		dbPost.Content = v.Article.Content
	case *feedsv1.Post_Link:
		dbPost.Kind = PostTypeLink
		dbPost.URI = v.Link.Uri
	case *feedsv1.Post_Image:
		dbPost.Kind = PostTypeImage
		dbPost.Title = v.Image.Title
		dbPost.Description = v.Image.Description
		dbPost.ImageURI = v.Image.ImageUri
	case *feedsv1.Post_Video:
		dbPost.Kind = PostTypeVideo
		dbPost.Title = v.Video.Title
		dbPost.Description = v.Video.Description
		dbPost.VideoURI = v.Video.VideoUri
		dbPost.ThumbnailImageURI = v.Video.ThumbnailImageUri
	case *feedsv1.Post_Audio:
		dbPost.Kind = PostTypeAudio
		dbPost.Title = v.Audio.Title
		dbPost.Description = v.Audio.Description
		dbPost.AudioURI = v.Audio.AudioUri
		dbPost.ThumbnailImageURI = v.Audio.ImageUri
	default:
		return nil, fmt.Errorf("unknown post kind: %T", post.Post)
	}

	if err := g.db.Create(dbPost).Error; err != nil {
		return nil, err
	}

	zpost, err := dbPostToZeniPost(dbPost)
	if err != nil {
		return nil, err
	}
	return zpost, nil
}

// EditPost implements zeni.DB.
func (g *gormZenaoDB) EditPost(postID string, req *zenaov1.EditPostRequest) error {
	g, span := g.trace("gzdb.EditPost")
	defer span.End()

	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return err
	}

	if err := g.db.Model(&Post{}).
		Where("id = ?", postIDInt).
		Update("content", req.Content).Error; err != nil {
		return err
	}

	if err := g.db.Where("post_id = ?", postIDInt).Delete(&Tag{}).Error; err != nil {
		return err
	}

	var tags []Tag
	for _, tagName := range req.Tags {
		tags = append(tags, Tag{
			PostID: uint(postIDInt),
			Name:   tagName,
		})
	}

	if len(tags) > 0 {
		if err := g.db.Create(&tags).Error; err != nil {
			return err
		}
	}

	return nil
}

// DeletePost implements zeni.DB.
func (g *gormZenaoDB) DeletePost(postID string) error {
	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return err
	}

	return g.db.Delete(&Post{}, postIDInt).Error
}

// GetPostByID implements zeni.DB
func (g *gormZenaoDB) GetPostByID(postID string) (*zeni.Post, error) {
	postIDUint, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse post id: %w", err)
	}

	var post Post
	if err := g.db.Preload("Reactions").Preload("Tags").First(&post, postIDUint).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("post not found: %s", postID)
		}
		return nil, err
	}

	return dbPostToZeniPost(&post)
}

// CountChildrenPosts implements zeni.DB.
func (g *gormZenaoDB) CountChildrenPosts(parentID string) (uint64, error) {
	parentIDUint, err := strconv.ParseUint(parentID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse parent post id: %w", err)
	}

	var count int64
	if err := g.db.Model(&Post{}).Where("parent_uri = ?", parentIDUint).Count(&count).Error; err != nil {
		return 0, err
	}

	return uint64(count), nil
}

// GetPostsByFeedID implements zeni.DB.
func (g *gormZenaoDB) GetPostsByFeedID(feedID string, limit int, offset int, tags []string) ([]*zeni.Post, error) {
	g, span := g.trace("gzdb.GetPostsByFeedID")
	defer span.End()

	feedIDUint, err := strconv.ParseUint(feedID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse feed id: %w", err)
	}

	var posts []*Post
	db := g.db.Model(&Post{}).
		Preload("Reactions").
		Preload("Tags").
		Where("feed_id = ?", feedIDUint).
		Order("pinned_at IS NOT NULL DESC, pinned_at DESC, id DESC")

	if len(tags) > 0 {
		db = db.
			Joins("JOIN tags ON tags.post_id = posts.id").
			Where("tags.name IN ?", tags).
			Group("posts.id").
			Having("COUNT(DISTINCT tags.name) = ?", len(tags))
	}

	if err := db.Limit(limit).Offset(offset).Find(&posts).Error; err != nil {
		return nil, err
	}

	res := make([]*zeni.Post, 0, len(posts))
	for _, p := range posts {
		zpost, err := dbPostToZeniPost(p)
		if err != nil {
			return nil, err
		}
		res = append(res, zpost)
	}

	return res, nil
}

func (g *gormZenaoDB) GetPostsByParentID(parentID string, limit int, offset int, tags []string) ([]*zeni.Post, error) {
	g, span := g.trace("gzdb.GetPostsByParentID")
	defer span.End()

	parentIDUint, err := strconv.ParseUint(parentID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse parent id: %w", err)
	}

	var posts []*Post
	db := g.db.Model(&Post{}).
		Preload("Reactions").
		Preload("Tags").
		Where("parent_uri = ?", parentIDUint).
		Order("pinned_at IS NOT NULL DESC, pinned_at DESC, id DESC")

	if len(tags) > 0 {
		db = db.
			Joins("JOIN tags ON tags.post_id = posts.id").
			Where("tags.name IN ?", tags).
			Group("posts.id").
			Having("COUNT(DISTINCT tags.name) = ?", len(tags))
	}

	if err := db.Limit(limit).Offset(offset).Find(&posts).Error; err != nil {
		return nil, err
	}

	res := make([]*zeni.Post, 0, len(posts))
	for _, p := range posts {
		zpost, err := dbPostToZeniPost(p)
		if err != nil {
			return nil, err
		}
		res = append(res, zpost)
	}

	return res, nil
}

// GetAllPosts implements zeni.DB.
func (g *gormZenaoDB) GetAllPosts(getDeleted bool) ([]*zeni.Post, error) {
	db := g.db
	if getDeleted {
		db = db.Unscoped()
	}

	var posts []*Post
	if err := db.Preload("Reactions").Preload("Tags").Find(&posts).Error; err != nil {
		return nil, err
	}

	res := make([]*zeni.Post, 0, len(posts))
	for _, p := range posts {
		zpost, err := dbPostToZeniPost(p)
		if err != nil {
			return nil, err
		}
		res = append(res, zpost)
	}

	return res, nil
}

// ReactPost implements zeni.DB.
func (g *gormZenaoDB) ReactPost(userID string, req *zenaov1.ReactPostRequest) error {
	g, span := g.trace("gzdb.ReactPost")
	defer span.End()

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	postIDInt, err := strconv.ParseUint(req.PostId, 10, 64)
	if err != nil {
		return err
	}

	return g.db.Transaction(func(tx *gorm.DB) error {
		var postExists bool
		if err := tx.Model(&Post{}).Select("1").Where("id = ?", postIDInt).Scan(&postExists).Error; err != nil {
			return err
		}
		if !postExists {
			return errors.New("post not found")
		}

		var reactionExists bool
		if err := tx.Model(&Reaction{}).Select("1").Where("post_id = ? AND icon = ? AND user_id = ?", postIDInt, req.Icon, userIDInt).Scan(&reactionExists).Error; err != nil {
			return err
		}
		if reactionExists {
			if err := tx.Where("post_id = ? AND icon = ? AND user_id = ?", postIDInt, req.Icon, userIDInt).Delete(&Reaction{}).Error; err != nil {
				return err
			}
			return nil
		}
		if err := tx.Create(&Reaction{
			PostID: uint(postIDInt),
			Icon:   req.Icon,
			UserID: uint(userIDInt),
		}).Error; err != nil {
			return err
		}

		return nil
	})
}

// PinPost implements zeni.DB.
func (g *gormZenaoDB) PinPost(feedID string, postID string, pin bool) error {
	g, span := g.trace("gzdb.PinPost")
	defer span.End()

	feedIDInt, err := strconv.ParseUint(feedID, 10, 64)
	if err != nil {
		return err
	}
	postIDInt, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return err
	}

	var pinnedAt *time.Time
	if pin {
		now := time.Now()
		pinnedAt = &now
	}

	res := g.db.Model(&Post{}).Where("id = ? AND feed_id = ?", postIDInt, feedIDInt).
		Update("pinned_at", pinnedAt)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("post not found in the specified feed")
	}

	return nil
}

// CreatePoll implements zeni.DB.
func (g *gormZenaoDB) CreatePoll(userID string, feedID string, parentURI string, req *zenaov1.CreatePollRequest) (*zeni.Poll, error) {
	g, span := g.trace("gzdb.CreatePoll")
	defer span.End()
	feedIDInt, err := strconv.ParseUint(feedID, 10, 64)
	if err != nil {
		return nil, err
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, err
	}

	dbPost := &Post{
		ParentURI: parentURI,
		UserID:    uint(userIDInt),
		FeedID:    uint(feedIDInt),
		Kind:      PostTypeLink,
		Tags: []Tag{{
			Name: "poll",
		}},
	}

	dbPoll := &Poll{
		Question: req.Question,
		Kind:     int(req.Kind),
		Duration: req.Duration,
		Results:  []PollResult{},
	}

	for _, option := range req.Options {
		dbPoll.Results = append(dbPoll.Results, PollResult{
			Option: option,
		})
	}

	if err := g.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(dbPost).Error; err != nil {
			return err
		}
		dbPoll.PostID = dbPost.ID
		if err := tx.Create(dbPoll).Error; err != nil {
			return err
		}
		// XXX: REMOVE THE URI ?
		postURI, err := ma.NewMultiaddr(fmt.Sprintf("/poll/%d", dbPoll.ID))
		if err != nil {
			return err
		}

		if err := tx.Model(&Post{}).Where("id = ?", dbPost.ID).Update("uri", postURI.String()).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return dbPollToZeniPoll(dbPoll, "")
}

// VotePoll implements zeni.DB.
func (g *gormZenaoDB) VotePoll(userID string, req *zenaov1.VotePollRequest) error {
	g, span := g.trace("gzdb.VotePoll")
	defer span.End()

	pollIDint, err := strconv.ParseUint(req.PollId, 10, 64)
	if err != nil {
		return nil
	}
	userIDint, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	return g.db.Transaction(func(tx *gorm.DB) error {
		var poll Poll
		if err := tx.Where("id = ?", pollIDint).Preload("Results").First(&poll).Error; err != nil {
			return err
		}

		var selectedResult PollResult
		if err := tx.Where("poll_id = ? AND option = ?", pollIDint, req.Option).First(&selectedResult).Error; err != nil {
			return err
		}

		// usage of table since i did not create a custom model for many2many relation
		var userVoteCount int64
		if err := tx.Table("poll_votes").Where("poll_result_id = ? AND user_id = ?", selectedResult.ID, userIDint).Count(&userVoteCount).Error; err != nil {
			return err
		}

		if userVoteCount > 0 {
			if err := tx.Table("poll_votes").Where("poll_result_id = ? AND user_id = ?", selectedResult.ID, userIDint).Delete(nil).Error; err != nil {
				return err
			}
		} else {
			if poll.Kind == int(pollsv1.PollKind_POLL_KIND_SINGLE_CHOICE) {
				if err := tx.Table("poll_votes").Where("user_id = ? AND poll_result_id IN (SELECT id FROM poll_results WHERE poll_id = ?)", userIDint, pollIDint).Delete(nil).Error; err != nil {
					return err
				}
			}
			if err := tx.Table("poll_votes").Create(map[string]interface{}{
				"poll_result_id": selectedResult.ID,
				"user_id":        userIDint,
			}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetPollByID implements zeni.DB.
func (g *gormZenaoDB) GetPollByID(pollID string, userID string) (*zeni.Poll, error) {
	pollIDint, err := strconv.ParseUint(pollID, 10, 64)
	if err != nil {
		return nil, err
	}

	var poll Poll
	if err := g.db.Where("id = ?", pollIDint).Preload("Results").Preload("Results.Votes").First(&poll).Error; err != nil {
		return nil, err
	}

	return dbPollToZeniPoll(&poll, userID)
}

// GetPollByPostID implements zeni.DB.
func (g *gormZenaoDB) GetPollByPostID(postID string, userID string) (*zeni.Poll, error) {
	postIDint, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		return nil, err
	}

	var poll Poll
	if err := g.db.Where("post_id = ?", postIDint).Preload("Results").Preload("Results.Votes").First(&poll).Error; err != nil {
		return nil, err
	}

	return dbPollToZeniPoll(&poll, userID)
}
