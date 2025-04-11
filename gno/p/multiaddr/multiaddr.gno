package multiaddr

// Multiaddr is the data structure representing a Multiaddr
type Multiaddr []Component

// NewMultiaddr parses and validates an input string, returning a *Multiaddr
func NewMultiaddr(s string) a Multiaddr {
	b, err := stringToBytes(s)
	if err != nil {
		return nil, err
	}
	return NewMultiaddrBytes(b)
}