package gzdb

import (
	"fmt"
	"strconv"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

// ListCommunities implements zeni.DB.
func (g *gormZenaoDB) ListCommunities(entityType string, entityID string, role string, limit int, offset int) ([]*zeni.Community, error) {
	g, span := g.trace("gzdb.ListCommunities")
	defer span.End()

	var orgIDs []uint
	if entityID != "" && entityType != "" {
		entityIDInt, err := strconv.ParseUint(entityID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse entity id: %w", err)
		}
		query := g.db.Model(&EntityRole{}).Select("org_id").Where("entity_type = ? AND entity_id = ? AND org_type = ?", entityType, entityIDInt, zeni.EntityTypeCommunity)
		if role != "" {
			query = query.Where("role = ?", role)
		}
		if err := query.Order("org_id DESC").Limit(limit).Offset(offset).Find(&orgIDs).Error; err != nil {
			return nil, fmt.Errorf("query org ids: %w", err)
		}
		if len(orgIDs) == 0 {
			return []*zeni.Community{}, nil
		}
	}

	var dbCmts []Community
	query := g.db.Model(&Community{}).Order("id DESC").Limit(limit).Offset(offset)
	if len(orgIDs) > 0 {
		query = query.Where("id IN ?", orgIDs)
	}
	if err := query.Find(&dbCmts).Error; err != nil {
		return nil, fmt.Errorf("query communities: %w", err)
	}
	zenCmts := make([]*zeni.Community, 0, len(dbCmts))
	for _, dbCmt := range dbCmts {
		zenCmt, err := dbCommunityToZeniCommunity(&dbCmt)
		if err != nil {
			return nil, fmt.Errorf("convert db community to zeni community: %w", err)
		}
		zenCmts = append(zenCmts, zenCmt)
	}

	return zenCmts, nil
}

// ListCommunitiesByUserRoles implements zeni.DB.
func (g *gormZenaoDB) ListCommunitiesByUserRoles(userID string, roles []string, limit int, offset int) ([]*zeni.CommunityWithRoles, error) {
	g, span := g.trace("gzdb.ListCommunitiesByUserRoles")
	defer span.End()

	if len(roles) == 0 {
		return []*zeni.CommunityWithRoles{}, nil
	}

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	query := g.db.Model(&Community{}).
		Distinct().
		Joins("INNER JOIN entity_roles ON entity_roles.org_id = communities.id").
		Where("entity_roles.entity_type = ? AND entity_roles.entity_id = ? AND entity_roles.org_type = ? AND entity_roles.role IN ?",
			zeni.EntityTypeUser, userIDInt, zeni.EntityTypeCommunity, roles).
		Order("communities.id DESC")

	var dbCmts []Community
	if err := query.Limit(limit).Offset(offset).Find(&dbCmts).Error; err != nil {
		return nil, fmt.Errorf("query communities: %w", err)
	}

	if len(dbCmts) == 0 {
		return []*zeni.CommunityWithRoles{}, nil
	}

	communityIDs := make([]uint, len(dbCmts))
	for i, cmt := range dbCmts {
		communityIDs[i] = cmt.ID
	}

	var entityRoles []EntityRole
	if err := g.db.Model(&EntityRole{}).
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id IN ? AND role IN ?",
			zeni.EntityTypeUser, userIDInt, zeni.EntityTypeCommunity, communityIDs, roles).
		Find(&entityRoles).Error; err != nil {
		return nil, fmt.Errorf("query entity roles: %w", err)
	}

	roleMap := make(map[uint][]string)
	for _, er := range entityRoles {
		roleMap[er.OrgID] = append(roleMap[er.OrgID], er.Role)
	}

	result := make([]*zeni.CommunityWithRoles, 0, len(dbCmts))
	for _, dbCmt := range dbCmts {
		zenCmt, err := dbCommunityToZeniCommunity(&dbCmt)
		if err != nil {
			return nil, fmt.Errorf("convert community: %w", err)
		}

		result = append(result, &zeni.CommunityWithRoles{
			Community: zenCmt,
			Roles:     roleMap[dbCmt.ID],
		})
	}

	return result, nil
}

// GetCommunity implements zeni.DB.
func (g *gormZenaoDB) getDBCommunity(id string) (*Community, error) {
	cmtIDInt, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return nil, err
	}
	var cmt Community
	cmt.ID = uint(cmtIDInt)
	if err := g.db.First(&cmt).Error; err != nil {
		return nil, err
	}
	return &cmt, nil
}

// CreateCommunity implements zeni.DB.
func (g *gormZenaoDB) CreateCommunity(creatorID string, administratorsIDs []string, membersIDs []string, eventsIDs []string, req *zenaov1.CreateCommunityRequest) (*zeni.Community, error) {
	g, span := g.trace("gzdb.CreateCommunity")
	defer span.End()

	creatorIDInt, err := strconv.ParseUint(creatorID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse creator id: %w", err)
	}

	community := &Community{
		DisplayName: req.DisplayName,
		Description: req.Description,
		AvatarURI:   req.AvatarUri,
		BannerURI:   req.BannerUri,
		CreatorID:   uint(creatorIDInt),
	}

	if err := g.db.Create(community).Error; err != nil {
		return nil, fmt.Errorf("create community in db: %w", err)
	}

	for _, adminID := range administratorsIDs {
		adminIDInt, err := strconv.ParseUint(adminID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse admin id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(adminIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      community.ID,
			Role:       zeni.RoleAdministrator,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create administrator role assignment in db: %w", err)
		}
	}

	for _, memberID := range membersIDs {
		memberIDInt, err := strconv.ParseUint(memberID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse member id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(memberIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      community.ID,
			Role:       zeni.RoleMember,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create member role assignment in db: %w", err)
		}
	}

	for _, eventID := range eventsIDs {
		eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse event id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeEvent,
			EntityID:   uint(eventIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      community.ID,
			Role:       zeni.RoleEvent,
		}

		if err := g.db.Create(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create event role assignment in db: %w", err)
		}
	}

	zcmt, err := dbCommunityToZeniCommunity(community)
	if err != nil {
		return nil, fmt.Errorf("convert db community to zeni community: %w", err)
	}

	return zcmt, nil
}

// EditCommunity implements zeni.DB.
func (g *gormZenaoDB) EditCommunity(communityID string, administratorsIDs []string, req *zenaov1.EditCommunityRequest) (*zeni.Community, error) {
	g, span := g.trace("gzdb.EditCommunity")
	defer span.End()

	cmtIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse community id: %w", err)
	}

	cmt := Community{
		DisplayName: req.DisplayName,
		Description: req.Description,
		AvatarURI:   req.AvatarUri,
		BannerURI:   req.BannerUri,
	}

	if err := g.updateUserRoles(zeni.RoleAdministrator, administratorsIDs, communityID, zeni.EntityTypeCommunity); err != nil {
		return nil, err
	}

	// NOTE: Administrators are also members of the community (members is like a base role for entity of user type)
	// Main reason for this is to simplify the registry as a simple list of members, without having to deal with roles.
	for _, adminID := range administratorsIDs {
		adminIDInt, err := strconv.ParseUint(adminID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse admin id: %w", err)
		}

		entityRole := &EntityRole{
			EntityType: zeni.EntityTypeUser,
			EntityID:   uint(adminIDInt),
			OrgType:    zeni.EntityTypeCommunity,
			OrgID:      uint(cmtIDInt),
			Role:       zeni.RoleMember,
		}

		if err := g.db.Save(entityRole).Error; err != nil {
			return nil, fmt.Errorf("create member role assignment in db: %w", err)
		}
	}

	if err := g.db.Model(&Community{}).Where("id = ?", cmtIDInt).Updates(cmt).Error; err != nil {
		return nil, fmt.Errorf("update community in db: %w", err)
	}

	dbcmt, err := g.getDBCommunity(communityID)
	if err != nil {
		return nil, fmt.Errorf("get community from db: %w", err)
	}

	zcmt, err := dbCommunityToZeniCommunity(dbcmt)
	if err != nil {
		return nil, fmt.Errorf("convert db community to zeni community: %w", err)
	}

	return zcmt, nil
}

// AddMemberToCommunity implements zeni.DB.
func (g *gormZenaoDB) AddMemberToCommunity(communityID string, userID string) error {
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}

	entityRole := &EntityRole{
		EntityType: zeni.EntityTypeUser,
		EntityID:   uint(userIDInt),
		OrgType:    zeni.EntityTypeCommunity,
		OrgID:      uint(communityIDInt),
		Role:       zeni.RoleMember,
	}

	if err := g.db.Save(entityRole).Error; err != nil {
		return fmt.Errorf("create member role assignment in db: %w", err)
	}

	return nil
}

// RemoveMemberFromCommunity implements zeni.DB.
// Remove all roles of the member in the community.
func (g *gormZenaoDB) RemoveMemberFromCommunity(communityID string, userID string) error {
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}

	if err := g.db.
		Model(&EntityRole{}).Where("org_type = ? AND org_id = ? AND entity_type = ? AND entity_id = ?",
		zeni.EntityTypeCommunity, communityIDInt, zeni.EntityTypeUser, userIDInt).
		Delete(&EntityRole{}).Error; err != nil {
		return fmt.Errorf("delete member role assignment in db: %w", err)
	}

	return nil
}

// GetCommunity implements zeni.DB.
func (g *gormZenaoDB) GetCommunity(communityID string) (*zeni.Community, error) {
	cmt, err := g.getDBCommunity(communityID)
	if err != nil {
		return nil, err
	}
	return dbCommunityToZeniCommunity(cmt)
}

// GetAllCommunities implements zeni.DB.
func (g *gormZenaoDB) GetAllCommunities() ([]*zeni.Community, error) {
	var communities []*Community
	if err := g.db.Find(&communities).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.Community, 0, len(communities))
	for _, c := range communities {
		zcmt, err := dbCommunityToZeniCommunity(c)
		if err != nil {
			return nil, err
		}
		res = append(res, zcmt)
	}
	return res, nil
}
