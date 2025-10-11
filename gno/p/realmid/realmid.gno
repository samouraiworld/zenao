package realmid

import (
	"chain/runtime"
	"strings"
)

func Previous() string {
	r := runtime.PreviousRealm()
	if r.IsUser() {
		return r.Address().String()
	}
	return r.PkgPath()
}

func Current() string {
	r := runtime.CurrentRealm()
	if r.IsUser() {
		return r.Address().String()
	}
	return r.PkgPath()
}

func IsPackage(id string) bool {
	return strings.ContainsRune(id, '.')
}

func IsUser(id string) bool {
	return !IsPackage(id)
}
