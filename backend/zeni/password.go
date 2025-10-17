package zeni

import (
	"crypto/ed25519"
	srand "crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

type argon2Params struct {
	TimeCost   uint32
	MemoryCost uint32
	Threads    uint8
	KeyLength  uint32
}

func ValidatePassword(password string, encodedHashParams string, expectedPK string) (bool, error) {
	if expectedPK == "" && password == "" {
		return true, nil
	}

	if expectedPK == "" && password != "" {
		return false, errors.New("event is not guarded")
	}

	saltBz, params, err := decodeHashParams(encodedHashParams)
	if err != nil {
		return false, err
	}

	hashBz := hashPass(password, saltBz, params)
	encodedHash := encodeHash(hashBz, saltBz, params)
	sk, err := EventSKFromPasswordHash(encodedHash)
	if err != nil {
		return false, err
	}
	pkBz := []byte(sk.Public().(ed25519.PublicKey))
	pk := base64.RawURLEncoding.EncodeToString(pkBz)
	if pk != expectedPK {
		return false, nil
	}

	return true, nil
}

func NewPasswordHash(password string) (string, error) {
	if password == "" {
		return "", nil
	}

	// params partly from https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
	hashParams := &argon2Params{
		TimeCost:   2,
		MemoryCost: 19456,
		Threads:    1,
		KeyLength:  32,
	}

	saltBz := make([]byte, 32)
	_, err := srand.Read(saltBz)
	if err != nil {
		return "", errors.New("failed to generate salt")
	}

	hashBz := hashPass(password, saltBz, hashParams)

	return encodeHash(hashBz, saltBz, hashParams), nil
}

func hashPass(password string, salt []byte, params *argon2Params) []byte {
	return argon2.IDKey([]byte(password), salt, params.TimeCost, params.MemoryCost, params.Threads, params.KeyLength)
}

func encodeHashParams(salt []byte, params *argon2Params) string {
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s",
		argon2.Version,
		params.MemoryCost,
		params.TimeCost,
		params.Threads,
		base64.RawStdEncoding.EncodeToString(salt),
	)
}

func encodeHash(hash []byte, salt []byte, params *argon2Params) string {
	return fmt.Sprintf("%s$%s", encodeHashParams(salt, params), base64.RawStdEncoding.EncodeToString(hash))
}

func decodeHashParams(encodedHashParams string) ([]byte, *argon2Params, error) {
	parts := strings.Split(encodedHashParams, "$")
	if len(parts) < 5 {
		return nil, nil, errors.New("malformed hash params")
	}

	if parts[0] != "" {
		return nil, nil, errors.New("invalid prefix")
	}
	if parts[1] != "argon2id" {
		return nil, nil, errors.New("unknown algo")
	}
	if parts[2] != fmt.Sprintf("v=%d", argon2.Version) {
		return nil, nil, errors.New("invalid algo version")
	}

	paramsParts := strings.Split(parts[3], ",")
	if len(paramsParts) != 3 {
		return nil, nil, errors.New("unexpected params count")
	}

	params := argon2Params{
		KeyLength: 32, // XXX: store it in the encoded params?
	}
	for _, param := range paramsParts {
		kv := strings.Split(param, "=")
		if len(kv) != 2 {
			return nil, nil, errors.New("invalid param kv")
		}
		switch kv[0] {
		case "m":
			m, err := strconv.ParseUint(kv[1], 10, 32)
			if err != nil {
				return nil, nil, errors.New("invalid m")
			}
			params.MemoryCost = uint32(m)
		case "t":
			t, err := strconv.ParseUint(kv[1], 10, 32)
			if err != nil {
				return nil, nil, errors.New("invalid t")
			}
			params.TimeCost = uint32(t)
		case "p":
			p, err := strconv.ParseUint(kv[1], 10, 8)
			if err != nil {
				return nil, nil, errors.New("invalid p")
			}
			params.Threads = uint8(p)
		default:
			return nil, nil, errors.New("unknown param")
		}
	}

	if params.MemoryCost == 0 || params.TimeCost == 0 || params.Threads == 0 {
		return nil, nil, errors.New("missing param")
	}

	saltBz, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, errors.New("invalid salt")
	}

	return saltBz, &params, nil
}

func decodeHash(hash string) ([]byte, []byte, *argon2Params, error) {
	parts := strings.Split(hash, "$")
	saltBz, params, err := decodeHashParams(strings.Join(parts[0:5], "$"))
	if err != nil {
		return nil, nil, nil, err
	}

	hashBz, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, errors.New("invalid hash")
	}
	params.KeyLength = uint32(len(hashBz))

	return hashBz, saltBz, params, nil
}
