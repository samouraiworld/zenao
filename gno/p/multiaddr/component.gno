package multiaddr

// Component is a single multiaddr Component.
type Component struct {
	// bytes is the raw bytes of the component. It includes the protocol code as
	// varint, possibly the size of the value, and the value.
	bytes         string // string for immutability.
	protocol      *Protocol
	valueStartIdx int // Index of the first byte of the Component's value in the bytes array
}
