package main

import (
	"fmt"

	ma "github.com/multiformats/go-multiaddr"
)

var generalTranscoder = ma.NewTranscoderFromFunctions(generalStB, generalBtS, nil)

var ZenaoProtocols []*ma.Protocol = []*ma.Protocol{
	{
		Name:       "poll",
		Code:       0x301,
		VCode:      ma.CodeToVarint(0x301),
		Size:       ma.LengthPrefixedVarSize,
		Transcoder: generalTranscoder,
	},
}

func generalStB(s string) ([]byte, error) {
	return []byte(s), nil
}

func generalBtS(b []byte) (string, error) {
	return string(b), nil
}

func RegisterMultiAddrProtocols() error {
	for _, p := range ZenaoProtocols {
		if err := ma.AddProtocol(*p); err != nil {
			return fmt.Errorf("failed to register multiaddr protoco %s: %w", p.Name, err)
		}
	}
	return nil
}
