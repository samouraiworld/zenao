package zeni

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPassword(t *testing.T) {
	valid, err := ValidatePassword("", "", "")
	require.NoError(t, err)
	require.True(t, valid)

	valid, err = ValidatePassword("password", "", "")
	require.ErrorContains(t, err, "event is not guarded")
	require.False(t, valid)

	hashParams := &argon2Params{
		TimeCost:   2,
		MemoryCost: 19456,
		Threads:    1,
		KeyLength:  32,
	}

	password := "password"
	salt := []byte("salt")
	hash := hashPass(password, salt, hashParams)
	require.NotEmpty(t, hash)

	encodedHash := encodeHash(hash, salt, hashParams)
	encodedHashParams := encodeHashParams(salt, hashParams)
	fmt.Printf("encodedHash: %s\n", encodedHash)
	privacy, sk, err := EventPrivacyFromPasswordHash(encodedHash)
	require.NoError(t, err)
	require.NotNil(t, sk)
	require.NotNil(t, privacy)
	require.NotNil(t, privacy.GetGuarded())
	fmt.Printf("pubk: %s\n", privacy.GetGuarded().ParticipationPubkey)
	require.Equal(t, "$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$9QyfT5o7Sa27GSMOCN2GzdqaNwYMX8RmDMyUUqwHjfY", encodedHash)

	_, decodedSalt, decodedParams, err := decodeHash(encodedHash)
	fmt.Printf("decodedSalt: %x, decodedParams: %+v\n", decodedSalt, decodedParams)
	require.NoError(t, err)
	require.Equal(t, salt, decodedSalt)
	require.Equal(t, hashParams, decodedParams)

	valid, err = ValidatePassword(password, encodedHashParams, privacy.GetGuarded().ParticipationPubkey)
	require.NoError(t, err)
	require.True(t, valid)

	valid, err = ValidatePassword("", encodedHashParams, privacy.GetGuarded().ParticipationPubkey)
	require.NoError(t, err)
	require.False(t, valid)

	valid, err = ValidatePassword("nimda", encodedHashParams, privacy.GetGuarded().ParticipationPubkey)
	require.NoError(t, err)
	require.False(t, valid)
}
