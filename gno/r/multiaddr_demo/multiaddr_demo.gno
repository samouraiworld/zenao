package multiaddr_demo

import (
	ma "gno.land/p/zenao/multiaddr"
)

// NOT USED FOR NOW SINCE I GENERATE THE LINK IN GNO CODE
var generalTranscoder = ma.NewTranscoderFromFunctions(generalStB, generalBtS, nil)

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
		ma.AddProtocol(*p)
	}
}

func NewMultiaddr(s string) ma.Multiaddr {
	ma, err := ma.NewMultiaddr(s)
	if err != nil {
		panic(err)
	}
	return ma
}
