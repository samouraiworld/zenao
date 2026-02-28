package gzdb

import (
	"fmt"
	"strconv"

	"github.com/samouraiworld/zenao/backend/zeni"
)

// GetOrgUsersWithRoles implements zeni.DB.
func (g *gormZenaoDB) GetOrgUsersWithRoles(orgType string, orgID string, roles []string) ([]*zeni.User, error) {
	g, span := g.trace("gzdb.GetOrgUsersWithRole")
	defer span.End()

	var entities []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND role in ? AND entity_type = ?",
			orgType, orgID, roles, zeni.EntityTypeUser).
		Find(&entities).Error; err != nil {
		return nil, err
	}
	if len(entities) == 0 {
		return []*zeni.User{}, nil
	}

	userIDs := make([]uint, 0, len(entities))
	for _, e := range entities {
		userIDs = append(userIDs, e.EntityID)
	}

	var users []User
	if err := g.db.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		result = append(result, dbUserToZeniDBUser(&u))
	}

	return result, nil
}

// GetOrgEntitiesWithRole implements zeni.DB.
func (g *gormZenaoDB) GetOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*zeni.EntityRole, error) {
	var roles []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ?",
			orgType, orgID, role, entityType).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.EntityRole, 0, len(roles))
	for _, r := range roles {
		result = append(result, dbEntityRoleToZeniEntityRole(&r))
	}
	return result, nil
}

// GetDeletedOrgEntitiesWithRole implements zeni.DB.
func (g *gormZenaoDB) GetDeletedOrgEntitiesWithRole(orgType string, orgID string, entityType string, role string) ([]*zeni.EntityRole, error) {
	var roles []EntityRole
	if err := g.db.
		Unscoped().
		Where("org_type = ? AND org_id = ? AND role = ? AND entity_type = ? AND deleted_at IS NOT NULL",
			orgType, orgID, role, entityType).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.EntityRole, 0, len(roles))
	for _, r := range roles {
		result = append(result, dbEntityRoleToZeniEntityRole(&r))
	}
	return result, nil
}

func (g *gormZenaoDB) GetOrgUsers(orgType string, orgID string) ([]*zeni.User, error) {
	g, span := g.trace("gzdb.GetOrgUsers")
	defer span.End()

	var roles []EntityRole
	if err := g.db.
		Where("org_type = ? AND org_id = ? AND entity_type = ?",
			orgType, orgID, zeni.EntityTypeUser).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return []*zeni.User{}, nil
	}
	userIDs := make([]uint, 0, len(roles))
	for _, r := range roles {
		userIDs = append(userIDs, r.EntityID)
	}
	var users []User
	if err := g.db.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		result = append(result, dbUserToZeniDBUser(&u))
	}
	return result, nil
}

// EntityRoles implements zeni.DB.
func (g *gormZenaoDB) EntityRoles(entityType string, entityID string, orgType string, orgID string) ([]string, error) {
	var roles []EntityRole

	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id = ?",
			entityType, entityID, orgType, orgID).
		Find(&roles).Error; err != nil {
		return nil, err
	}

	res := make([]string, 0, len(roles))
	for _, role := range roles {
		res = append(res, role.Role)
	}

	return res, nil
}

// EntitiesWithRoles implements zeni.DB.
func (g *gormZenaoDB) EntitiesWithRoles(orgType string, orgID string, roles []string) ([]*zeni.EntityRole, error) {
	var entities []EntityRole

	if err := g.db.
		Model(&EntityRole{}).
		Where("org_type = ? AND org_id = ? AND role IN ?",
			orgType, orgID, roles).
		Group("entity_type, entity_id").
		Find(&entities).Error; err != nil {
		return nil, err
	}

	result := make([]*zeni.EntityRole, 0, len(entities))
	for _, e := range entities {
		result = append(result, dbEntityRoleToZeniEntityRole(&e))
	}

	return result, nil
}

// CountEntities implements zeni.DB.
func (g *gormZenaoDB) CountEntities(orgType string, orgID string, entityType string, role string) (uint32, error) {
	var count int64

	query := g.db.Model(&EntityRole{})

	if orgType != "" {
		query = query.Where("org_type = ?", orgType)
	}

	if orgID != "" {
		query = query.Where("org_id = ?", orgID)
	}

	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}

	if role != "" {
		query = query.Where("role = ?", role)
	}

	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}

	return uint32(count), nil
}

// AddEventToCommunity implements zeni.DB.
func (g *gormZenaoDB) AddEventToCommunity(eventID string, communityID string) error {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse event id: %w", err)
	}
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}

	entityRole := &EntityRole{
		EntityType: zeni.EntityTypeEvent,
		EntityID:   uint(eventIDInt),
		OrgType:    zeni.EntityTypeCommunity,
		OrgID:      uint(communityIDInt),
		Role:       zeni.RoleEvent,
	}

	if err := g.db.Save(entityRole).Error; err != nil {
		return fmt.Errorf("create event role assignment in db: %w", err)
	}

	return nil
}

// RemoveEventFromCommunity implements zeni.DB.
func (g *gormZenaoDB) RemoveEventFromCommunity(eventID string, communityID string) error {
	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse event id: %w", err)
	}
	communityIDInt, err := strconv.ParseUint(communityID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse community id: %w", err)
	}
	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND org_id = ?",
			zeni.EntityTypeEvent, eventIDInt, zeni.EntityTypeCommunity, communityIDInt).
		Delete(&EntityRole{}).Error; err != nil {
		return fmt.Errorf("delete event role assignment in db: %w", err)
	}
	return nil
}

// CommunitiesByEvent implements zeni.DB.
func (g *gormZenaoDB) CommunitiesByEvent(eventID string) ([]*zeni.Community, error) {
	g, span := g.trace("gzdb.CommunitiesByEvent")
	defer span.End()

	eventIDInt, err := strconv.ParseUint(eventID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse event id: %w", err)
	}
	var roles []EntityRole
	if err := g.db.
		Where("entity_type = ? AND entity_id = ? AND org_type = ?",
			zeni.EntityTypeEvent, eventIDInt, zeni.EntityTypeCommunity).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return []*zeni.Community{}, nil
	}

	communityIDs := make([]uint, 0, len(roles))
	for _, r := range roles {
		communityIDs = append(communityIDs, r.OrgID)
	}

	var communities []Community
	if err := g.db.Where("id IN ?", communityIDs).Find(&communities).Error; err != nil {
		return nil, err
	}
	result := make([]*zeni.Community, 0, len(communities))
	for _, c := range communities {
		zcmt, err := dbCommunityToZeniCommunity(&c)
		if err != nil {
			return nil, fmt.Errorf("convert db community to zeni community: %w", err)
		}
		result = append(result, zcmt)
	}
	return result, nil
}
