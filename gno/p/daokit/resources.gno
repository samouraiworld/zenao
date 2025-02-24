package daokit

import (
	"gno.land/p/demo/avl"
	"gno.land/p/zenao/daocond"
)

type ResourcesStore struct {
	Tree *avl.Tree // string -> daocond.Condition
}

type Resource struct {
	Handler   MessageHandler
	Condition daocond.Condition
}

func NewResourcesStore() *ResourcesStore {
	return &ResourcesStore{
		Tree: avl.NewTree(),
	}
}

func (r *ResourcesStore) Set(resource *Resource) {
	r.Tree.Set(resource.Handler.Type(), resource)
}

func (r *ResourcesStore) Get(name string) *Resource {
	value, ok := r.Tree.Get(name)
	if !ok {
		return nil
	}
	res := value.(*Resource)
	return res
}
