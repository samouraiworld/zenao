package zeni

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	srand "crypto/rand"
	"encoding/base64"
)

var curve = elliptic.P256()

type Ticket struct {
	sk *ecdsa.PrivateKey
}

func (t *Ticket) Secret() string {
	bz, err := t.sk.Bytes()
	if err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(bz)
}

func (t *Ticket) Pubkey() string {
	pk := t.sk.Public().(*ecdsa.PublicKey)
	bz, err := pk.Bytes()
	if err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(bz[1:])
}

func (t *Ticket) Signature(gatekeeper string) (string, error) {
	// XXX: should be deterministic signature??
	signature, err := t.sk.Sign(srand.Reader, []byte(gatekeeper), nil)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(signature), nil
}

func NewTicket() (*Ticket, error) {
	sk, err := ecdsa.GenerateKey(curve, srand.Reader)
	if err != nil {
		return nil, err
	}

	return &Ticket{sk: sk}, nil
}

func NewTicketFromSecret(secret string) (*Ticket, error) {
	secretBz, err := base64.RawURLEncoding.DecodeString(secret)
	if err != nil {
		return nil, err
	}

	sk, err := ecdsa.ParseRawPrivateKey(curve, secretBz)
	if err != nil {
		return nil, err
	}

	return &Ticket{sk: sk}, nil
}
