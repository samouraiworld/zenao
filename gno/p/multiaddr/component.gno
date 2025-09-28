package multiaddr

import (
	"strings"

	"gno.land/p/nt/ufmt"
)

// Component is a single multiaddr Component.
type Component struct {
	// bytes is the raw bytes of the component. It includes the protocol code as
	// varint, possibly the size of the value, and the value.
	bytes         string // string for immutability.
	protocol      *Protocol
	valueStartIdx int // Index of the first byte of the Component's value in the bytes array
}

func (c *Component) Protocol() Protocol {
	if c == nil {
		return Protocol{}
	}
	if c.protocol == nil {
		return Protocol{}
	}
	return *c.protocol
}

func (c *Component) Value() string {
	if c == nil {
		return ""
	}
	// This Component MUST have been checked by validateComponent when created
	value, _ := c.valueAndErr()
	return value
}

func (c *Component) valueAndErr() (string, error) {
	if c == nil {
		return "", errNilPtr
	}
	if c.protocol == nil {
		return "", ufmt.Errorf("component has nil protocol")
	}
	if c.protocol.Transcoder == nil {
		return "", nil
	}
	value, err := c.protocol.Transcoder.BytesToString([]byte(c.bytes[c.valueStartIdx:]))
	if err != nil {
		return "", err
	}
	return value, nil
}

func (c *Component) String() string {
	if c == nil {
		return "<nil component>"
	}
	var b strings.Builder
	c.writeTo(&b)
	return b.String()
}

func (c *Component) writeTo(b *strings.Builder) {
	if c == nil {
		return
	}
	if c.protocol == nil {
		return
	}
	b.WriteByte('/')
	b.WriteString(c.protocol.Name)
	value := c.Value()
	if len(value) == 0 {
		return
	}
	if !(c.protocol.Path && value[0] == '/') {
		b.WriteByte('/')
	}
	b.WriteString(value)
}

// validateComponent MUST be called after creating a non-zero Component.
// It ensures that we will be able to call all methods on Component without
// error.
func validateComponent(c *Component) error {
	if c == nil {
		return errNilPtr
	}
	if c.protocol == nil {
		return ufmt.Errorf("component is missing protocol")
	}
	if c.valueStartIdx > len(c.bytes) {
		return ufmt.Errorf("component valueStartIdx is greater than the length of the component's bytes")
	}

	if len(c.protocol.VCode) == 0 {
		return ufmt.Errorf("Component is missing its protocol's VCode field")
	}
	if len(c.bytes) < len(c.protocol.VCode) {
		return ufmt.Errorf("component size mismatch: %d != %d", len(c.bytes), len(c.protocol.VCode))
	}
	if !bytesEqual([]byte(c.bytes[:len(c.protocol.VCode)]), c.protocol.VCode) {
		return ufmt.Errorf("component's VCode field is invalid: %v != %v", []byte(c.bytes[:len(c.protocol.VCode)]), c.protocol.VCode)
	}
	if c.protocol.Size < 0 {
		size, n, err := ReadVarintCode([]byte(c.bytes[len(c.protocol.VCode):]))
		if err != nil {
			return err
		}
		if size != len(c.bytes[c.valueStartIdx:]) {
			return ufmt.Errorf("component value size mismatch: %d != %d", size, len(c.bytes[c.valueStartIdx:]))
		}
		if len(c.protocol.VCode)+n+size != len(c.bytes) {
			return ufmt.Errorf("component size mismatch: %d != %d", len(c.protocol.VCode)+n+size, len(c.bytes))
		}
	} else {
		// Fixed size value
		size := c.protocol.Size / 8
		if size != len(c.bytes[c.valueStartIdx:]) {
			return ufmt.Errorf("component value size mismatch: %d != %d", size, len(c.bytes[c.valueStartIdx:]))
		}

		if len(c.protocol.VCode)+size != len(c.bytes) {
			return ufmt.Errorf("component size mismatch: %d != %d", len(c.protocol.VCode)+size, len(c.bytes))
		}
	}

	_, err := c.valueAndErr()
	if err != nil {
		return err
	}
	if c.protocol.Transcoder != nil {
		err = c.protocol.Transcoder.ValidateBytes([]byte(c.bytes[c.valueStartIdx:]))
		if err != nil {
			return err
		}
	}
	return nil
}

func bytesEqual(a []byte, b []byte) bool {
	// workaround for "illegal conversion of readonly or externally stored value" error
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
