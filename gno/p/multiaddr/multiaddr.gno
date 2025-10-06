package multiaddr

import (
	"errors"
	"strings"

	"gno.land/p/nt/ufmt"
)

var errNilPtr = errors.New("nil ptr")

// Multiaddr is the data structure representing a Multiaddr
type Multiaddr []Component

// NewMultiaddr parses and validates an input string, returning a *Multiaddr
func NewMultiaddr(r ProtocolRegistry, s string) (a Multiaddr, err error) {
	b, err := stringToBytes(r, s)
	if err != nil {
		return nil, err
	}
	return NewMultiaddrBytes(r, b)
}

// NewMultiaddrBytes initializes a Multiaddr from a byte representation.
// It validates it as an input string.
func NewMultiaddrBytes(r ProtocolRegistry, b []byte) (a Multiaddr, err error) {
	bytesRead, m, err := readMultiaddr(r, b)
	if err != nil {
		return nil, err
	}
	if bytesRead != len(b) {
		return nil, ufmt.Errorf("unexpected extra data. %v bytes leftover", len(b)-bytesRead)
	}
	if len(m) == 0 {
		return nil, nil
	}
	return m, nil
}

// String returns the string representation of a Multiaddr
func (a Multiaddr) String() string {
	var buf strings.Builder

	for _, c := range a {
		buf.WriteString(c.String())
	}
	return buf.String()
}

// Protocols returns the list of protocols this Multiaddr has.
// will panic in case we access bytes incorrectly.
func (m Multiaddr) Protocols() []Protocol {
	out := make([]Protocol, 0, len(m))
	for _, c := range m {
		out = append(out, c.Protocol())
	}
	return out
}

var ErrProtocolNotFound = ufmt.Errorf("protocol not found in multiaddr")

func (m Multiaddr) ValueForProtocol(code int) (value string, err error) {
	for _, c := range m {
		if c.Protocol().Code == code {
			return c.Value(), nil
		}
	}
	return "", ErrProtocolNotFound
}
