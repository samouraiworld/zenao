package gzdb

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPassword(t *testing.T) {
	valid, err := validatePassword("", "")
	require.NoError(t, err)
	require.True(t, valid)

	valid, err = validatePassword("password", "")
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
	require.Equal(t, "$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$9QyfT5o7Sa27GSMOCN2GzdqaNwYMX8RmDMyUUqwHjfY", encodedHash)

	_, decodedSalt, decodedParams, err := decodeHash(encodedHash)
	require.NoError(t, err)
	require.Equal(t, salt, decodedSalt)
	require.Equal(t, hashParams, decodedParams)

	valid, err = validatePassword(password, encodedHash)
	require.NoError(t, err)
	require.True(t, valid)

	valid, err = validatePassword("", encodedHash)
	require.NoError(t, err)
	require.False(t, valid)

	valid, err = validatePassword("nimda", encodedHash)
	require.NoError(t, err)
	require.False(t, valid)
}
