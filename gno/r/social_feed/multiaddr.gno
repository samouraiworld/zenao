package social_feed

import (
	ma "gno.land/p/zenao/multiaddr"
)

var (
	Protocols         = ma.NewProtocolRegistry()
	generalTranscoder = ma.NewTranscoderFromFunctions(generalStB, generalBtS, nil)
)

var SocialFeedProtocols []*ma.Protocol = []*ma.Protocol{
	{
		Name:       "gno",
		Code:       0x300,
		VCode:      ma.CodeToVarint(0x300),
		Path:       true, // XXX: use URL encoding to avoid to have to put it at the end
		Size:       ma.LengthPrefixedVarSize,
		Transcoder: generalTranscoder,
	}, {
		Name:       "poll",
		Code:       0x301,
		VCode:      ma.CodeToVarint(0x301),
		Size:       ma.LengthPrefixedVarSize,
		Transcoder: generalTranscoder,
	},
}

func init() {
	for _, p := range SocialFeedProtocols {
		Protocols.AddProtocol(*p)
	}
}

func generalStB(s string) ([]byte, error) {
	return []byte(s), nil
}

func generalBtS(b []byte) (string, error) {
	return string(b), nil
}
