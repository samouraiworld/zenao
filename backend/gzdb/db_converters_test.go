package gzdb

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDBUserToZeniDBUserAvatar(t *testing.T) {
	cases := []struct {
		name   string
		stored string
		want   string
	}{
		{name: "empty", stored: "", want: userDefaultAvatar},
		{name: "legacy default", stored: legacyUserDefaultAvatar, want: userDefaultAvatar},
		{name: "custom ipfs", stored: "ipfs://bafkreicustomavatar", want: "ipfs://bafkreicustomavatar"},
		{name: "custom https", stored: "https://example.com/a.png", want: "https://example.com/a.png"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			u := dbUserToZeniDBUser(&User{AvatarURI: tc.stored})
			require.Equal(t, tc.want, u.AvatarURI)
		})
	}
}
