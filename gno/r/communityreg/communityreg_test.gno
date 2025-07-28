package communityreg

import (
	"std"
	"testing"

	"gno.land/p/zenao/communities"
	zenaov1 "gno.land/p/zenao/zenao/v1"
)

// XXX: add more tests for members
func TestCommunities(t *testing.T) {
	initialOwner := std.Address("g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94") // zenao-dev-admin
	std.TestSetRealm(std.NewUserRealm(initialOwner))

	// list no communities
	{
		communities := listCommunities(10, 0)
		if len(communities) != 0 {
			t.Fatalf("expected no communities, got %d", len(communities))
		}
	}

	// inject communities
	getters := map[string]communities.InfoGetter{}
	communities := []*struct {
		pkgPath string
		name    string
	}{
		{"gno.land/r/zenao/communities/1-community", "Community One"},
		{"gno.land/r/zenao/communities/2-community", "Community Two"},
	}
	for _, community := range communities {
		std.TestSetRealm(std.NewCodeRealm(community.pkgPath))
		getters[community.pkgPath] = func() *zenaov1.CommunityInfo {
			return &zenaov1.CommunityInfo{
				PkgPath:     community.pkgPath,
				DisplayName: community.name,
			}
		}
		Register(getters[community.pkgPath])
		std.TestSetRealm(std.NewUserRealm(initialOwner))

		IndexCommunity(community.pkgPath)
	}

	// list communities
	{
		communities := listCommunities(10, 0)
		if len(communities) != 2 {
			t.Fatalf("expected 2 communities, got %d", len(communities))
		}
		expectedNames := []string{"Community One", "Community Two"}
		for i, community := range communities {
			if community.DisplayName != expectedNames[i] {
				t.Errorf("expected community name %s, got %s", expectedNames[i], community.DisplayName)
			}
		}
	}
}
