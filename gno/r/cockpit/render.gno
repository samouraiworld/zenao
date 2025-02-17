package cockpit

import (
	"std"
	"strings"

	"gno.land/p/demo/mux"
	"gno.land/p/demo/ufmt"
	"gno.land/p/demo/users"
	"gno.land/p/moul/md"
	"gno.land/r/demo/profile"
	rusers "gno.land/r/demo/users"
)

const (
	chainId       = "test5"
	pkgPath       = "r/zenao/cockpit"
	userSlug      = "u"
	usersRealm    = "r/demo/users"
	ghLinkHint    = "r/gnoland/ghverify?help&__func=RequestVerification"
	ghProfileHint = "/r/demo/profile:u/"
	gatewayDomain = "rose-many-bass-859.mypinata.cloud"
)

func Render(reqPath string) string {
	router := mux.NewRouter()

	router.HandleFunc("", renderHome)
	router.HandleFunc(userSlug+"/{aon}", renderUser)

	return router.Render(reqPath)
}

func renderHome(res *mux.ResponseWriter, req *mux.Request) {
	res.Write("# Cockpit\n\n")
	res.Write("See `:" + userSlug + "/{addressOrName}`\n\n")
	res.Write("Examples:\n")
	elems := rusers.ListUsersByPrefix("", 20)
	for _, elem := range elems {
		res.Write("- [ " + elem + " ](./" + pkgPath + ":" + userSlug + "/@" + elem + ")\n")
	}
}

func renderUser(res *mux.ResponseWriter, req *mux.Request) {
	addr, username, ok := resolveUserBasics(req.GetVar("aon"))
	if !ok {
		res.Write("404")
		return
	}

	// FIXME: markdown injection, spam
	res.Write("# " + profile.GetStringField(addr, profile.DisplayName, "Anon") + "\n")

	res.Write(md.Image("Avatar", pfpURL(profile.GetStringField(addr, profile.Avatar, "Anon"))) + "\n")

	if username != "" {
		res.Write("- Username: [" + username + "](/" + usersRealm + ":" + username + ")\n")
	} else {
		res.Write("- Username: [Not registered](/" + usersRealm + "?help&__func=Register)\n")
	}

	res.Write("- Address: [" + addr.String() + "](https://gnoscan.io/accounts/" + addr.String() + "?chainId=" + chainId + ")\n\n")

	// FIXME: markdown injection, spam
	res.Write("```\n" + profile.GetStringField(addr, profile.Bio, "No bio") + "\n```\n[Full profile / edit](" + ghProfileHint + addr.String() + ")\n")
}

func resolveUserBasics(aon string) (std.Address, string, bool) {
	user := rusers.GetUserByAddressOrName(users.AddressOrName(aon))
	if user != nil {
		return user.Address, user.Name, true
	}

	addr := std.Address(aon)
	if addr.IsValid() {
		return addr, "", true
	}

	return addr, "", false
}

func pfpURL(uri string) string {
	if !strings.HasPrefix(uri, "ipfs://") {
		return uri
	}
	withoutScheme := strings.TrimPrefix(uri, "ipfs://")
	res := ufmt.Sprintf(`https://%s/ipfs/%s?img-width=100&img-height=100&img-fit=cover&img-dpr=2`, gatewayDomain, withoutScheme)
	return res
}
