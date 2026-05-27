package gzdb

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

// CreateUser implements zeni.DB.
func (g *gormZenaoDB) CreateUser(authID string) (*zeni.User, error) {
	user := &User{
		AuthID:    &authID,
		Bio:       "Zenao managed user",
		AvatarURI: userDefaultAvatar,
	}

	if err := g.db.Create(user).Error; err != nil {
		return nil, err
	}

	user.DisplayName = fmt.Sprintf("Zenao user #%d", user.ID)
	if err := g.db.Model(user).
		Update("display_name", user.DisplayName).Error; err != nil {
		return nil, err
	}

	return dbUserToZeniDBUser(user), nil
}

// EditUser implements zeni.DB.
func (g *gormZenaoDB) EditUser(userID string, req *zenaov1.EditUserRequest) error {
	// XXX: validate?
	if err := g.db.Model(&User{}).Where("id = ?", userID).Updates(User{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURI:   req.AvatarUri,
	}).Error; err != nil {
		return err
	}
	return nil
}

// PromoteUser implements zeni.DB.
func (g *gormZenaoDB) PromoteUser(userID string, plan zeni.Plan) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return err
	}

	if !plan.IsValid() {
		return fmt.Errorf("invalid plan: %s", plan)
	}

	return g.db.Model(&User{}).Where("id = ?", userIDInt).Update("plan", string(plan)).Error
}

// UserExists implements zeni.DB.
func (g *gormZenaoDB) GetUser(authID string) (*zeni.User, error) {
	var user User
	if err := g.db.Where("auth_id = ?", authID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return dbUserToZeniDBUser(&user), nil
}

// GetUsersByIDs implements zeni.DB.
func (g *gormZenaoDB) GetUsersByIDs(ids []string) ([]*zeni.User, error) {
	g, span := g.trace("gzdb.GetUsersByIDs")
	defer span.End()

	if len(ids) == 0 {
		return []*zeni.User{}, nil
	}

	userIDs := make([]uint, 0, len(ids))
	for _, id := range ids {
		idInt, err := strconv.ParseUint(id, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse user id: %w", err)
		}
		userIDs = append(userIDs, uint(idInt))
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

// GetAllUsers implements zeni.DB.
func (g *gormZenaoDB) GetAllUsers() ([]*zeni.User, error) {
	var users []*User
	if err := g.db.Find(&users).Error; err != nil {
		return nil, err
	}
	res := make([]*zeni.User, 0, len(users))
	for _, u := range users {
		res = append(res, dbUserToZeniDBUser(u))
	}
	return res, nil
}

// CreateTeam implements zeni.DB.
func (g *gormZenaoDB) CreateTeam(ownerID string, displayName string) (*zeni.User, error) {
	g, span := g.trace("gzdb.CreateTeam")
	defer span.End()

	ownerIDInt, err := strconv.ParseUint(ownerID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse owner id: %w", err)
	}

	team := &User{
		AuthID:      nil, // Teams don't have auth
		DisplayName: displayName,
		Bio:         "",
		AvatarURI:   userDefaultAvatar,
		IsTeam:      true,
	}

	if err := g.db.Create(team).Error; err != nil {
		return nil, fmt.Errorf("create team in db: %w", err)
	}

	// Add creator as owner
	ownerRole := &EntityRole{
		EntityType: zeni.EntityTypeUser,
		EntityID:   uint(ownerIDInt),
		OrgType:    zeni.EntityTypeTeam,
		OrgID:      team.ID,
		Role:       zeni.RoleTeamOwner,
	}

	if err := g.db.Create(ownerRole).Error; err != nil {
		return nil, fmt.Errorf("create owner role: %w", err)
	}

	return dbUserToZeniDBUser(team), nil
}

// EditTeam implements zeni.DB.
func (g *gormZenaoDB) EditTeam(teamID string, memberIDs []string, req *zenaov1.EditTeamRequest) error {
	g, span := g.trace("gzdb.EditTeam")
	defer span.End()

	teamIDInt, err := strconv.ParseUint(teamID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse team id: %w", err)
	}

	team := User{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURI:   req.AvatarUri,
	}

	if err := g.db.Model(&User{}).Where("id = ? AND is_team = ?", teamIDInt, true).Updates(team).Error; err != nil {
		return fmt.Errorf("update team in db: %w", err)
	}

	if err := g.updateUserRoles(zeni.RoleTeamMember, memberIDs, teamID, zeni.EntityTypeTeam); err != nil {
		return fmt.Errorf("update members: %w", err)
	}

	return nil
}

// GetUserByID implements zeni.DB.
func (g *gormZenaoDB) GetUserByID(userID string) (*zeni.User, error) {
	g, span := g.trace("gzdb.GetUserByID")
	defer span.End()

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	var user User
	if err := g.db.First(&user, userIDInt).Error; err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return dbUserToZeniDBUser(&user), nil
}

func (g *gormZenaoDB) GetUserTeams(userID string) ([]*zeni.TeamWithRole, error) {
	g, span := g.trace("gzdb.GetUserTeams")
	defer span.End()

	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	var roles []EntityRole
	if err := g.db.Where("entity_type = ? AND entity_id = ? AND org_type = ?",
		zeni.EntityTypeUser, userIDInt, zeni.EntityTypeTeam).
		Find(&roles).Error; err != nil {
		return nil, fmt.Errorf("get team roles: %w", err)
	}

	if len(roles) == 0 {
		return nil, nil
	}

	teamIDs := make([]uint, 0, len(roles))
	for _, role := range roles {
		teamIDs = append(teamIDs, role.OrgID)
	}

	var teamUsers []User
	if err := g.db.Where("id IN ?", teamIDs).Find(&teamUsers).Error; err != nil {
		return nil, fmt.Errorf("get teams: %w", err)
	}

	teamMap := make(map[uint]*User, len(teamUsers))
	for i := range teamUsers {
		teamMap[teamUsers[i].ID] = &teamUsers[i]
	}

	teams := make([]*zeni.TeamWithRole, 0, len(roles))
	for _, role := range roles {
		team, ok := teamMap[role.OrgID]
		if !ok {
			continue
		}
		teams = append(teams, &zeni.TeamWithRole{
			Team: dbUserToZeniDBUser(team),
			Role: role.Role,
		})
	}

	return teams, nil
}

// CanDeleteTeam implements zeni.DB.
func (g *gormZenaoDB) CanDeleteTeam(teamID string) error {
	teamIDInt, err := strconv.ParseUint(teamID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse team id: %w", err)
	}

	// Check if team is organizer of any event
	var organizerRoles int64
	if err := g.db.Model(&EntityRole{}).
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND role = ?",
			zeni.EntityTypeUser, teamIDInt, zeni.EntityTypeEvent, zeni.RoleOrganizer).
		Count(&organizerRoles).Error; err != nil {
		return fmt.Errorf("check organizer roles: %w", err)
	}
	if organizerRoles > 0 {
		return errors.New("cannot delete team: team is organizer of one or more events")
	}

	// Check if team is administrator of any community
	var adminRoles int64
	if err := g.db.Model(&EntityRole{}).
		Where("entity_type = ? AND entity_id = ? AND org_type = ? AND role = ?",
			zeni.EntityTypeUser, teamIDInt, zeni.EntityTypeCommunity, zeni.RoleAdministrator).
		Count(&adminRoles).Error; err != nil {
		return fmt.Errorf("check administrator roles: %w", err)
	}
	if adminRoles > 0 {
		return errors.New("cannot delete team: team is administrator of one or more communities")
	}

	// Check if team is participant in any future event (not started yet)
	now := time.Now()
	var futureParticipations int64
	if err := g.db.Model(&EntityRole{}).
		Joins("JOIN events ON events.id = entity_roles.org_id").
		Where("entity_roles.entity_type = ? AND entity_roles.entity_id = ? AND entity_roles.org_type = ? AND entity_roles.role = ?",
			zeni.EntityTypeUser, teamIDInt, zeni.EntityTypeEvent, zeni.RoleParticipant).
		Where("events.start_date > ? AND events.deleted_at IS NULL", now).
		Count(&futureParticipations).Error; err != nil {
		return fmt.Errorf("check future participations: %w", err)
	}
	if futureParticipations > 0 {
		return errors.New("cannot delete team: team is participant in one or more future events")
	}

	return nil
}

// DeleteUserPostsByAuthor implements zeni.DB.
func (g *gormZenaoDB) DeleteUserPostsByAuthor(userID string) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}
	return g.db.Where("user_id = ?", userIDInt).Delete(&Post{}).Error
}

// RemoveUserFromAllCommunities implements zeni.DB.
func (g *gormZenaoDB) RemoveUserFromAllCommunities(userID string) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}
	return g.db.Where("entity_type = ? AND entity_id = ? AND org_type = ?",
		zeni.EntityTypeUser, userIDInt, zeni.EntityTypeCommunity).
		Delete(&EntityRole{}).Error
}

// RemoveUserGatekeeperRoles implements zeni.DB.
func (g *gormZenaoDB) RemoveUserGatekeeperRoles(userID string) error {
	userIDInt, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse user id: %w", err)
	}
	return g.db.Where("entity_type = ? AND entity_id = ? AND org_type = ? AND role = ?",
		zeni.EntityTypeUser, userIDInt, zeni.EntityTypeEvent, zeni.RoleGatekeeper).
		Delete(&EntityRole{}).Error
}

// DeleteTeam implements zeni.DB.
func (g *gormZenaoDB) DeleteTeam(teamID string) error {
	g, span := g.trace("gzdb.DeleteTeam")
	defer span.End()

	if err := g.CanDeleteTeam(teamID); err != nil {
		return err
	}

	teamIDInt, err := strconv.ParseUint(teamID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse team id: %w", err)
	}

	if err := g.RemoveUserGatekeeperRoles(teamID); err != nil {
		return fmt.Errorf("remove gatekeeper roles: %w", err)
	}

	if err := g.RemoveUserFromAllCommunities(teamID); err != nil {
		return fmt.Errorf("leave communities: %w", err)
	}

	if err := g.DeleteUserPostsByAuthor(teamID); err != nil {
		return fmt.Errorf("delete posts: %w", err)
	}

	if err := g.db.Where("org_type = ? AND org_id = ?",
		zeni.EntityTypeTeam, teamIDInt).Delete(&EntityRole{}).Error; err != nil {
		return fmt.Errorf("delete team membership roles: %w", err)
	}

	if err := g.db.Delete(&User{}, teamIDInt).Error; err != nil {
		return fmt.Errorf("delete team: %w", err)
	}

	return nil
}
