package multiaddr

import (
	"strings"

	"gno.land/p/nt/avl"
	"gno.land/p/nt/ufmt"
)

type ProtocolRegistry interface {
	AddProtocol(p Protocol)
	ProtocolWithName(s string) (Protocol, error)
	ProtocolWithCode(c int) (Protocol, error)
	ProtocolPtrWithCode(c int) (*Protocol, error)
	ProtocolsWithString(s string) ([]Protocol, error)
	Protocols() []Protocol
}

type ProtocolRegistryImpl struct {
	protocolsByName   *avl.Tree
	protocolsByCode   *avl.Tree
	protocolPtrByCode *avl.Tree
	protocols         []Protocol
}

func NewProtocolRegistry() ProtocolRegistry {
	return &ProtocolRegistryImpl{
		protocolsByName:   avl.NewTree(),
		protocolsByCode:   avl.NewTree(),
		protocolPtrByCode: avl.NewTree(),
		protocols:         []Protocol{},
	}
}

func (r *ProtocolRegistryImpl) AddProtocol(p Protocol) {
	if r.protocolsByName.Has(p.Name) {
		panic(ufmt.Errorf("protocol by the name %q already exists", p.Name))
	}

	if r.protocolsByCode.Has(ufmt.Sprintf("%d", p.Code)) {
		panic(ufmt.Sprintf("protocol code %d already taken by %q", p.Code, p.Code))
	}
	if p.Size != 0 && p.Transcoder == nil {
		panic(ufmt.Sprintf("protocols with arguments must define transcoders"))
	}
	if p.Path && p.Size >= 0 {
		panic(ufmt.Sprintf("path protocols must have variable-length sizes"))
	}
	if len(p.VCode) == 0 {
		panic(ufmt.Sprintf("protocol code %d is missing its VCode field", p.Code))
	}

	r.protocols = append(r.protocols, p)
	r.protocolsByName.Set(p.Name, p)
	r.protocolsByCode.Set(ufmt.Sprintf("%d", p.Code), p)
	r.protocolPtrByCode.Set(ufmt.Sprintf("%d", p.Code), &p)
}

func (r *ProtocolRegistryImpl) ProtocolWithName(s string) (Protocol, error) {
	v, ok := r.protocolsByName.Get(s)
	if !ok {
		return Protocol{}, ufmt.Errorf("protocol by the name %q not found", s)
	}
	return v.(Protocol), nil
}

func (r *ProtocolRegistryImpl) ProtocolWithCode(c int) (Protocol, error) {
	v, ok := r.protocolsByCode.Get(ufmt.Sprintf("%d", c))
	if !ok {
		return Protocol{}, ufmt.Errorf("protocol code %d not found", c)
	}
	return v.(Protocol), nil
}

func (r *ProtocolRegistryImpl) ProtocolPtrWithCode(c int) (*Protocol, error) {
	v, ok := r.protocolPtrByCode.Get(ufmt.Sprintf("%d", c))
	if !ok {
		return nil, ufmt.Errorf("protocol code %d not found", c)
	}
	return v.(*Protocol), nil
}

func (r *ProtocolRegistryImpl) ProtocolsWithString(s string) ([]Protocol, error) {
	s = strings.Trim(s, "/")
	sp := strings.Split(s, "/")
	if len(sp) == 0 {
		return nil, ufmt.Errorf("empty multiaddr")
	}

	t := make([]Protocol, len(sp))
	for i, name := range sp {
		p, err := r.ProtocolWithName(name)
		if err != nil {
			return nil, err
		}
		t[i] = p
	}
	return t, nil
}

func (r *ProtocolRegistryImpl) Protocols() []Protocol {
	return r.protocols
}
