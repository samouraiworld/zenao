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

	if field.Desc.IsMap() {
		panic("map not supported")
	}

	printFieldCustom := func(line func(valuePrefix string, receiver string) string, zeroValue string) {
		if field.Desc.IsList() {
			g.P(prefix, `if len(`, receiver, `) != 0 {`)
			g.P(prefix, `	fmt.Fprintf(buf, "%s\t`, field.GoName, `: {\n", linePrefix)`)
			g.P(prefix, `	linePrefix += "\t"`)
			g.P(prefix, `	for _, elem := range `, receiver, ` {`)
			g.P(prefix, `		`, line("", "elem"))
			g.P(prefix, `	}`)
			g.P(prefix, `	linePrefix = linePrefix[:len(linePrefix)-1]`)
			g.P(prefix, `	fmt.Fprintf(buf, "%s\t},\n", linePrefix)`)
		} else {
			g.P(prefix, `if `, receiver, ` != `, zeroValue, ` {`)
			g.P(prefix, line(field.GoName+`: `, receiver))
		}
		g.P(prefix, `}`)
	}

	printField := func(mod string, zeroValue string) {
		printFieldCustom(func(valuePrefix, receiver string) string {
			return `fmt.Fprintf(buf, "%s\t` + valuePrefix + mod + `,\n", linePrefix, ` + receiver + `)`
		}, zeroValue)
	}

	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		printField("%t", "false")
	case protoreflect.EnumKind:
		panic("enums not supported")
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind, protoreflect.Uint32Kind, protoreflect.Fixed32Kind, protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind, protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		printField("%d", "0")
	case protoreflect.FloatKind, protoreflect.DoubleKind:
		printField("%g", "0")
	case protoreflect.StringKind:
		printField("%q", `""`)
	case protoreflect.BytesKind:
		panic("bytes not supported")
	case protoreflect.MessageKind, protoreflect.GroupKind:
		printFieldCustom(func(valuePrefix, receiver string) string {
			return `fmt.Fprintf(buf, "%s\t` + valuePrefix + `&%s%s,\n", linePrefix, typePrefix, ` + receiver + `.GnoLiteral(typePrefix, linePrefix+"\t"))`
		}, "nil")
	default:
		panic(fmt.Errorf("unexpected field type %q", field.Desc.Kind().String()))
	}

	if field.Desc.IsList() {
	}
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

// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func fieldGnoType(g *protogen.GeneratedFile, field *protogen.Field) (goType string, pointer bool) {
	if field.Desc.IsWeak() {
		return "struct{}", false
	}

	pointer = field.Desc.HasPresence()
	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		goType = "bool"
	case protoreflect.EnumKind:
		goType = g.QualifiedGoIdent(field.Enum.GoIdent)
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind:
		goType = "int32"
	case protoreflect.Uint32Kind, protoreflect.Fixed32Kind:
		goType = "uint32"
	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		goType = "int64"
	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		goType = "uint64"
	case protoreflect.FloatKind:
		goType = "float32"
	case protoreflect.DoubleKind:
		goType = "float64"
	case protoreflect.StringKind:
		goType = "string"
	case protoreflect.BytesKind:
		goType = "[]byte"
		pointer = false // rely on nullability of slices for presence
	case protoreflect.MessageKind, protoreflect.GroupKind:
		goType = "*" + g.QualifiedGoIdent(field.Message.GoIdent)
		pointer = false // pointer captured as part of the type
	}
	switch {
	case field.Desc.IsList():
		return "[]" + goType, false
	case field.Desc.IsMap():
		panic("map not supported")
		/*
			keyType, _ := fieldGoType(g, f, field.Message.Fields[0])
			valType, _ := fieldGoType(g, f, field.Message.Fields[1])
			return fmt.Sprintf("map[%v]%v", keyType, valType), false
		*/
	}
	return goType, pointer
}
