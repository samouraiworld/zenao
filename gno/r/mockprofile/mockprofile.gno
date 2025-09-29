package mockprofile

import "gno.land/p/nt/avl"

type MockProfile struct {
	fields avl.Tree
}

func (p *MockProfile) GetProfileString(addr address, field string, def string) string {
	v, ok := p.fields.Get(field)
	if !ok {
		return def
	}
	return v.(string)
}

func (p *MockProfile) SetStringField(cur realm, field, value string) bool {
	return p.fields.Set(field, value)
}
