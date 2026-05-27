package zeni

import (
	"crypto"
	"crypto/ed25519"
	srand "crypto/rand"
	"encoding/base64"
)

type Ticket struct {
	sk ed25519.PrivateKey
}

func (t *Ticket) Secret() string {
	return base64.RawURLEncoding.EncodeToString(t.sk.Seed())
}

func (t *Ticket) Pubkey() string {
	pk := t.sk.Public().(ed25519.PublicKey)
	return base64.RawURLEncoding.EncodeToString(pk)
}

func (t *Ticket) Signature(gatekeeper string) (string, error) {
	signature, err := t.sk.Sign(srand.Reader, []byte(gatekeeper), crypto.Hash(0))
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(signature), nil
}

func NewTicket() (*Ticket, error) {
	secret := make([]byte, ed25519.SeedSize)
	if _, err := srand.Read(secret); err != nil {
		return nil, err
	}
	return &Ticket{sk: ed25519.NewKeyFromSeed(secret)}, nil
}

func NewTicketFromSecret(secret string) (*Ticket, error) {
	secretBz, err := base64.RawURLEncoding.DecodeString(secret)
	if err != nil {
		return nil, err
	}
	return &Ticket{sk: ed25519.NewKeyFromSeed(secretBz)}, nil
}
