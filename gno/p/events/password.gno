package events

import (
	"encoding/base64"
)

func (e *Event) ValidatePassword(derivedPubkey string) bool {
	// public event, no password needed
	if len(e.ParticipationPubkey) == 0 {
		return true
	}
	pubBz, err := base64.RawURLEncoding.DecodeString(derivedPubkey)
	if err != nil {
		return false
	}
	return string(pubBz) == string(e.ParticipationPubkey)
}
