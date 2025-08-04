package gzdb

import (
	"fmt"

	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

type Community struct {
	gorm.Model
	DisplayName string
	Description string
	AvatarURI   string
	BannerURI   string
	CreatorID   uint
	Creator     User `gorm:"foreignKey:CreatorID"`
}

func dbCommunityToZeniCommunity(dbcmt *Community) (*zeni.Community, error) {
	return &zeni.Community{
		CreatedAt:   dbcmt.CreatedAt,
		ID:          fmt.Sprintf("%d", dbcmt.ID),
		DisplayName: dbcmt.DisplayName,
		Description: dbcmt.Description,
		AvatarURI:   dbcmt.AvatarURI,
		BannerURI:   dbcmt.BannerURI,
		CreatorID:   fmt.Sprintf("%d", dbcmt.CreatorID),
	}, nil
}
