package main

import (
	"fmt"

	"github.com/samouraiworld/zenao/backend/zeni"
)

func setupChain(namespace string) (*gnoZenaoChain, error) {
	return &gnoZenaoChain{
		namespace: namespace,
	}, nil
}

type gnoZenaoChain struct {
	namespace string
}

// EntityRealmID implements ZenaoChain.
func (g *gnoZenaoChain) EntityRealmID(entityType string, entityID string) (string, error) {
	switch entityType {
	case zeni.EntityTypeUser:
		return g.userRealmPkgPath(entityID), nil
	case zeni.EntityTypeCommunity:
		return g.communityPkgPath(entityID), nil
	case zeni.EntityTypeEvent:
		return g.eventRealmPkgPath(entityID), nil
	default:
		return "", fmt.Errorf("unknown entity type: %s", entityType)
	}
}

// UserRealmID implements ZenaoChain.
func (g *gnoZenaoChain) UserRealmID(userID string) string {
	return g.userRealmPkgPath(userID)
}

// CommunityRealmID implements ZenaoChain.
func (g *gnoZenaoChain) CommunityRealmID(communityID string) string {
	return g.communityPkgPath(communityID)
}

// EventRealmID implements ZenaoChain.
func (g *gnoZenaoChain) EventRealmID(eventID string) string {
	return g.eventRealmPkgPath(eventID)
}

func (g *gnoZenaoChain) eventRealmPkgPath(eventID string) string {
	return fmt.Sprintf("gno.land/r/%s/events/e%s", g.namespace, eventID)
}

func (g *gnoZenaoChain) communityPkgPath(communityID string) string {
	return fmt.Sprintf("gno.land/r/%s/communities/c%s", g.namespace, communityID)
}

func (g *gnoZenaoChain) userRealmPkgPath(userID string) string {
	return fmt.Sprintf("gno.land/r/%s/users/u%s", g.namespace, userID)
}

var _ zeni.Chain = (*gnoZenaoChain)(nil)
