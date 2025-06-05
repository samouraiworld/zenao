package multiaddr

type Transcoder interface {
	// Validates and encodes to bytes a multiaddr that's in the string representation.
	StringToBytes(string) ([]byte, error)
	// Validates and decodes to a string a multiaddr that's in the bytes representation.
	BytesToString([]byte) (string, error)
	// Validates bytes when parsing a multiaddr that's already in the bytes representation.
	ValidateBytes([]byte) error
}

func NewTranscoderFromFunctions(
	s2b func(string) ([]byte, error),
	b2s func([]byte) (string, error),
	val func([]byte) error,
) Transcoder {
	return twrp{s2b, b2s, val}
}

type twrp struct {
	strtobyte func(string) ([]byte, error)
	bytetostr func([]byte) (string, error)
	validbyte func([]byte) error
}

func (t twrp) StringToBytes(s string) ([]byte, error) {
	return t.strtobyte(s)
}
func (t twrp) BytesToString(b []byte) (string, error) {
	return t.bytetostr(b)
}

func (t twrp) ValidateBytes(b []byte) error {
	if t.validbyte == nil {
		return nil
	}
	return t.validbyte(b)
}
