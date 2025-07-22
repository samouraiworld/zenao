package communities

import (
	"std"

	zenaov1 "gno.land/p/zenao/zenao/v1"
)

type InfoGetter func() *zenaov1.CommunityInfo

func (c *Community) Info() *zenaov1.CommunityInfo {
	return &zenaov1.CommunityInfo{
		DisplayName:    c.getProfileString(std.CurrentRealm().Address(), "DisplayName", ""),
		Description:    c.getProfileString(std.CurrentRealm().Address(), "Bio", ""),
		AvatarUri:      c.getProfileString(std.CurrentRealm().Address(), "Avatar", ""),
		BannerUri:      c.getProfileString(std.CurrentRealm().Address(), "Banner", ""),
		Administrators: c.DAOPrivate.Members.GetMembersWithRole("administrator"),
		CountMembers:   uint32(c.DAOPrivate.Members.MembersCount()),
	}
}
