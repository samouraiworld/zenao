package zeni

import (
	"crypto/ed25519"
	"encoding/base64"

	"golang.org/x/crypto/sha3"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
)

func EventSKFromPasswordHash(passwordHash string) (ed25519.PrivateKey, error) {
	if passwordHash == "" {
		return nil, nil
	}

	skBz := sha3.Sum256([]byte(passwordHash))
	// XXX: use pbkdf instead of sha3 on password hash?
	sk := ed25519.NewKeyFromSeed(skBz[:])

	return sk, nil
}

func EventPrivacyFromSK(sk ed25519.PrivateKey) (*zenaov1.EventPrivacy, error) {
	if len(sk) == 0 {
		return &zenaov1.EventPrivacy{EventPrivacy: &zenaov1.EventPrivacy_Public{Public: &zenaov1.EventPrivacyPublic{}}}, nil
	}

	pkBz := []byte(sk.Public().(ed25519.PublicKey))
	pk := base64.RawURLEncoding.EncodeToString(pkBz)

	return &zenaov1.EventPrivacy{EventPrivacy: &zenaov1.EventPrivacy_Guarded{Guarded: &zenaov1.EventPrivacyGuarded{
		ParticipationPubkey: pk,
	}}}, nil
}

func EventPrivacyFromPasswordHash(passwordHash string) (*zenaov1.EventPrivacy, error) {
	sk, err := EventSKFromPasswordHash(passwordHash)
	if err != nil {
		return nil, err
	}
	return EventPrivacyFromSK(sk)
}
