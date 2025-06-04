package multiaddr_demo

import (
	"gno.land/p/demo/ufmt"
	ma "gno.land/p/zenao/multiaddr"
)

var (
	protocols         = ma.NewProtocolRegistry()
	addresses         = []ma.Multiaddr{}
	generalTranscoder = ma.NewTranscoderFromFunctions(generalStB, generalBtS, nil)
)

var ZenaoProtocols []*ma.Protocol = []*ma.Protocol{
	{
		Name:       "gno",
		Code:       0x300,
		VCode:      ma.CodeToVarint(0x300),
		Path:       true, // this means we have to put it at the end
		Size:       ma.LengthPrefixedVarSize,
		Transcoder: generalTranscoder,
	}, {
		Name:       "poll",
		Code:       0x301,
		VCode:      ma.CodeToVarint(0x301),
		Size:       64, // Fixed size of exactly 8 bytes
		Transcoder: generalTranscoder,
	},
}

func generalStB(s string) ([]byte, error) {
	return []byte(s), nil
}

func generalBtS(b []byte) (string, error) {
	return string(b), nil
}

func RegisterMultiAddrProtocols() {
	for _, p := range ZenaoProtocols {
		protocols.AddProtocol(*p)
	}
}

func NewMultiaddr(s string) ma.Multiaddr {
	ma, err := ma.NewMultiaddr(protocols, s)
	if err != nil {
		panic(err)
	}
	addresses = append(addresses, ma)
	return ma
}

func Render(path string) string {
	s := ""
	protos := protocols.Protocols()
	s += ufmt.Sprintf("Protocols:\n")
	for _, p := range protos {
		s += ufmt.Sprintf("%s\n\n", p.Name)
		s += ufmt.Sprintf("Code: %d\n", p.Code)
		s += ufmt.Sprintf("VCode: %v\n", p.VCode)
		s += ufmt.Sprintf("Size: %d\n", p.Size)
		s += ufmt.Sprintf("Path: %t\n", p.Path)
		s += ufmt.Sprintf("Transcoder: %v\n", p.Transcoder)
		s += ufmt.Sprintf("--------------------------------\n")
	}
	s += ufmt.Sprintf("Addresses:\n")
	for _, ma := range addresses {
		s += ufmt.Sprintf("- %s\n\n", ma.String())
	}
	return s
}
