package multiaddr

import (
	"encoding/binary"
	"math"
	"math/bits"
)

// CodeToVarint converts an integer to a varint-encoded []byte
func CodeToVarint(num int) []byte {
	if num < 0 || num > math.MaxInt32 {
		panic("invalid code")
	}
	return ToUvarint(uint64(num))
}

// UvarintSize returns the size (in bytes) of `num` encoded as a unsigned varint.
//
// This may return a size greater than MaxUvarintLen63, which would be an
// illegal value, and would be rejected by readers.
func UvarintSize(num uint64) int {
	bits := bits.Len64(num)
	q, r := bits/7, bits%7
	size := q
	if r > 0 || size == 0 {
		size++
	}
	return size
}

// ToUvarint converts an unsigned integer to a varint-encoded []byte
func ToUvarint(num uint64) []byte {
	buf := make([]byte, UvarintSize(num))
	n := binary.PutUvarint(buf, uint64(num))
	return buf[:n]
}
