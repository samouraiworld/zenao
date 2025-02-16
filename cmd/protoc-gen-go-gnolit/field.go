package main

import (
	"fmt"
	"strings"

	"google.golang.org/protobuf/compiler/protogen"
	"google.golang.org/protobuf/reflect/protoreflect"
)

// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func fieldToLit(prefix string, g *protogen.GeneratedFile, field *protogen.Field) {
	if field.Desc.IsWeak() {
		panic("weak fields not supported")
	}

	parentTypeName := field.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	receiver := parentReceiver + "." + field.GoName

	if field.Oneof != nil {
		return
	}

	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		g.P(prefix, `fmt.Fprintf(buf, "%s\t`, field.GoName, `: %t,\n", linePrefix, `, receiver, `)`)
		return
	case protoreflect.EnumKind:
		panic("enums not supported")
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind, protoreflect.Uint32Kind, protoreflect.Fixed32Kind, protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind, protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		g.P(prefix, `fmt.Fprintf(buf, "%s\t`, field.GoName, `: %d,\n", linePrefix, `, receiver, `)`)
		return
	case protoreflect.FloatKind, protoreflect.DoubleKind:
		g.P(prefix, `fmt.Fprintf(buf, "%s\t`, field.GoName, `: %g,\n", linePrefix, `, receiver, `)`)
		return
	case protoreflect.StringKind:
		g.P(prefix, `fmt.Fprintf(buf, "%s\t`, field.GoName, `: %q,\n", linePrefix, `, receiver, `)`)
		return
	case protoreflect.BytesKind:
		panic("bytes not supported")
	case protoreflect.MessageKind, protoreflect.GroupKind:
		g.P(prefix, "if ", receiver, " != nil {")
		g.P(prefix, `fmt.Fprintf(buf, "%s\t`, field.GoName, `: &%s%s,\n", linePrefix, typePrefix, `, receiver, `.GnoLiteral(typePrefix, linePrefix+"\t"))`)
		g.P(prefix, "}")
		return
	}
	switch {
	case field.Desc.IsList():
		panic("list not supported")
	case field.Desc.IsMap():
		panic("map not supported")
		/*
			keyType, _ := fieldGoType(g, f, field.Message.Fields[0])
			valType, _ := fieldGoType(g, f, field.Message.Fields[1])
			return fmt.Sprintf("map[%v]%v", keyType, valType), false
		*/
	}
	panic(fmt.Errorf("unexpected field type %q", field.Desc.Kind().String()))
}

// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func oneOfToLit(prefix string, g *protogen.GeneratedFile, oneOf *protogen.Oneof) {
	name := JSONCamelCase(string(oneOf.Desc.Name()))

	parentTypeName := oneOf.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	receiver := parentReceiver + "." + oneOf.GoName

	g.P(prefix, "switch val := ", receiver, ".(type) {")
	for _, f := range oneOf.Fields {
		g.P(prefix, "case *", parentTypeName, "_", f.GoName, ":")
		g.P(prefix, `fmt.Fprintf(buf, "%s\t`, oneOf.GoName, `: &%s,\n", linePrefix, val.`, f.GoName, `.GnoLiteral(typePrefix, linePrefix+"\t"))`)
	}
	g.P(prefix, "default:")
	g.P(prefix, `	panic(errors.New("unknown `, name, ` variant"))`)
	g.P(prefix, "}")
}

// JSONCamelCase converts a snake_case identifier to a camelCase identifier,
// according to the protobuf JSON specification.
func JSONCamelCase(s string) string {
	var b []byte
	var wasUnderscore bool
	for i := 0; i < len(s); i++ { // proto identifiers are always ASCII
		c := s[i]
		if c != '_' {
			if wasUnderscore && isASCIILower(c) {
				c -= 'a' - 'A' // convert to uppercase
			}
			b = append(b, c)
		}
		wasUnderscore = c == '_'
	}
	return string(b)
}

func isASCIILower(c byte) bool {
	return 'a' <= c && c <= 'z'
}
