package communities

import (
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

type InfoGetter func() *zenaov1.CommunityInfo

func (c *Community) Info() *zenaov1.CommunityInfo {
	realmAddr := c.DAOPrivate.Realm.Address()

	return &zenaov1.CommunityInfo{
		DisplayName:    c.getProfileString(realmAddr, "DisplayName", ""),
		Description:    c.getProfileString(realmAddr, "Bio", ""),
		AvatarUri:      c.getProfileString(realmAddr, "Avatar", ""),
		BannerUri:      c.getProfileString(realmAddr, "Banner", ""),
		Administrators: c.DAOPrivate.Members.GetMembersWithRole("administrator"),
		CountMembers:   uint32(c.DAOPrivate.Members.MembersCount()),
	}
}
