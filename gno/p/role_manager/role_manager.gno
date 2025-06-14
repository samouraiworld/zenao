package role_manager

import (
	"std"

	"gno.land/p/demo/avl"
	"gno.land/p/demo/ufmt"
)

const (
	PermissionAll       = "*"
	PermissionWriteRole = "role:write"
)

type Role struct {
	name        string
	description string
	permissions *avl.Tree // permission -> struct{}
	users       *avl.Tree // user addr -> struct{}
}

type RoleInfo struct {
	Name        string
	Description string
}

type RoleManager struct {
	roles *avl.Tree // role name -> Role
	users *avl.Tree // user addr -> role[]
}

func New() *RoleManager {
	rm := &RoleManager{
		roles: avl.NewTree(),
		users: avl.NewTree(),
	}

	return rm
}

func (rm *RoleManager) CreateNewRole(roleName string, description string, permissions []string) {
	if rm.roles.Has(roleName) {
		panic("role already exists")
	}

	role := &Role{
		name:        roleName,
		description: description,
		permissions: avl.NewTree(),
		users:       avl.NewTree(),
	}

	for _, permission := range permissions {
		role.permissions.Set(permission, struct{}{})
	}

	rm.roles.Set(roleName, role)
}

func (rm *RoleManager) DeleteRole(roleName string) {
	if !rm.roles.Has(roleName) {
		panic("role " + roleName + " does not exist")
	}

	role := rm.mustGetRole(roleName)
	role.users.Iterate("", "", func(key string, value interface{}) bool {
		user := std.Address(key)
		userRoles := rm.getUser(user)
		userRoles.Remove(roleName)
		return false
	})
	rm.roles.Remove(roleName)
}

func (rm *RoleManager) RoleInfo(roleName string) RoleInfo {
	r := rm.mustGetRole(roleName)
	return RoleInfo{Name: r.name, Description: r.description}
}

func (rm *RoleManager) SetRoleDescription(roleName string, description string) {
	role := rm.mustGetRole(roleName)
	role.description = description
}

func (rm *RoleManager) AddPermissionToRole(permission string, roleName string) {
	role := rm.mustGetRole(roleName)
	role.permissions.Set(permission, struct{}{})
}

func (rm *RoleManager) RemovePermissionFromRole(permission string, roleName string) {
	role := rm.mustGetRole(roleName)
	role.permissions.Remove(permission)
}

func (rm *RoleManager) AddRoleToUser(user std.Address, roleName string) {
	role := rm.mustGetRole(roleName)
	userRoles := rm.getUser(user)
	if userRoles == nil {
		userRoles = avl.NewTree()
		rm.users.Set(user.String(), userRoles)
	}
	userRoles.Set(roleName, role)
	role.users.Set(user.String(), struct{}{})
}

func (rm *RoleManager) RemoveRoleFromUser(user std.Address, roleName string) {
	role := rm.mustGetRole(roleName)
	userRoles := rm.getUser(user)
	if userRoles == nil {
		return
	}
	userRoles.Remove(roleName)
	role.users.Remove(user.String())
	if userRoles.Size() == 0 {
		rm.users.Remove(user.String())
	}
}

func (rm *RoleManager) HasPermission(user std.Address, permission string) bool {
	userRoles := rm.getUser(user)
	if userRoles == nil {
		return false
	}
	res := false
	userRoles.Iterate("", "", func(key string, value interface{}) bool {
		role, ok := value.(*Role)
		if !ok {
			panic(ufmt.Errorf("role %q does not exist", role))
		}
		if role.permissions.Has(permission) || role.permissions.Has(PermissionAll) {
			res = true
			return true
		}
		return false
	})
	return res
}

func (rm *RoleManager) HasRole(user std.Address, roleName string) bool {
	userRoles := rm.getUser(user)
	if userRoles == nil {
		return false
	}
	return userRoles.Has(roleName)
}

func (rm *RoleManager) RoleExists(roleName string) bool {
	return rm.roles.Has(roleName)
}

func (rm *RoleManager) CountRoles() int {
	return rm.roles.Size()
}

func (rm *RoleManager) CountUserRoles(user std.Address) int {
	userRoles := rm.getUser(user)
	if userRoles == nil {
		return 0
	}
	return userRoles.Size()
}

func (rm *RoleManager) CountRoleUsers(roleName string) int {
	role := rm.mustGetRole(roleName)
	return role.users.Size()
}

func (rm *RoleManager) GetRoles() []string {
	i := 0
	res := make([]string, rm.roles.Size())
	rm.roles.Iterate("", "", func(key string, value interface{}) bool {
		res[i] = key
		i++
		return false
	})
	return res
}

func (rm *RoleManager) GetRoleUsers(roleName string) []string {
	role := rm.mustGetRole(roleName)
	i := 0
	users := role.users
	res := make([]string, users.Size())
	users.Iterate("", "", func(key string, value interface{}) bool {
		res[i] = key
		i++
		return false
	})
	return res
}

func (rm *RoleManager) GetUserRoles(user std.Address) []string {
	userRoles, ok := rm.users.Get(user.String())
	if !ok {
		return []string{}
	}
	i := 0
	roles := userRoles.(*avl.Tree)
	res := make([]string, roles.Size())
	roles.Iterate("", "", func(key string, value interface{}) bool {
		res[i] = key
		i++
		return false
	})
	return res
}

func (rm *RoleManager) RemoveAllRolesFromUser(user std.Address) {
	userRoles := rm.getUser(user)
	if userRoles == nil {
		return
	}
	userRoles.Iterate("", "", func(key string, value interface{}) bool {
		role := value.(*Role)
		role.users.Remove(user.String())
		return false
	})
	rm.users.Remove(user.String())
}

func (rm *RoleManager) mustGetRole(roleName string) *Role {
	role, ok := rm.roles.Get(roleName)
	if !ok {
		panic("role " + roleName + " does not exist")
	}
	return role.(*Role)
}

func (rm *RoleManager) getUser(addr std.Address) *avl.Tree {
	user, ok := rm.users.Get(addr.String())
	if !ok {
		return nil
	}
	return user.(*avl.Tree)
}
