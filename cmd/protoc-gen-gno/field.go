package main

import (
	"fmt"
	"strconv"
	"strings"

	"google.golang.org/protobuf/compiler/protogen"
	"google.golang.org/protobuf/reflect/protoreflect"
)

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

// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func fieldToJSON(fieldsObjName string, prefix string, g *protogen.GeneratedFile, field *protogen.Field) {
	if field.Desc.IsWeak() {
		panic("weak fields not supported")
	}

	name := strconv.Quote(field.Desc.JSONName())
	parentTypeName := field.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	receiver := parentReceiver + "." + field.GoName

	if field.Oneof != nil {
		return
	}

	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		g.P(prefix, fieldsObjName, "[", name, `] = json.BoolNode("", `, receiver, ")")
		return
	case protoreflect.EnumKind:
		panic("enums not supported")
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind, protoreflect.Uint32Kind, protoreflect.Fixed32Kind, protoreflect.FloatKind, protoreflect.DoubleKind:
		g.P(prefix, fieldsObjName, "[", name, `] = json.NumberNode("", float64(`, receiver, "))")
		return
	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		g.P(prefix, fieldsObjName, "[", name, `] = json.StringNode("", strconv.FormatInt(`, receiver, ", 64))")
		return
	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		g.P(prefix, fieldsObjName, "[", name, `] = json.StringNode("", strconv.FormatUint(`, receiver, ", 64))")
		return
	case protoreflect.StringKind:
		g.P(prefix, fieldsObjName, "[", name, `] = json.StringNode("", `, receiver, ")")
		return
	case protoreflect.BytesKind:
		panic("bytes not supported")
	case protoreflect.MessageKind, protoreflect.GroupKind:
		g.P(prefix, "if ", receiver, " != nil {")
		g.P(prefix, "	", fieldsObjName, "[", name, `] = `, receiver, ".ToJSON()")
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
func oneOfFieldToJSON(fieldsObjName string, receiver string, prefix string, g *protogen.GeneratedFile, field *protogen.Field) {
	if field.Desc.IsWeak() {
		panic("weak fields not supported")
	}

	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		g.P(prefix, fieldsObjName, ` = json.BoolNode("", `, receiver, ")")
		return
	case protoreflect.EnumKind:
		panic("enums not supported")
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind, protoreflect.Uint32Kind, protoreflect.Fixed32Kind, protoreflect.FloatKind, protoreflect.DoubleKind:
		g.P(prefix, fieldsObjName, `  = json.NumberNode("", float64(`, receiver, "))")
		return
	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		g.P(prefix, fieldsObjName, ` = json.StringNode("", strconv.FormatInt(`, receiver, ", 64))")
		return
	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		g.P(prefix, fieldsObjName, ` = json.StringNode("", strconv.FormatUint(`, receiver, ", 64))")
		return
	case protoreflect.StringKind:
		g.P(prefix, fieldsObjName, ` = json.StringNode("", `, receiver, ")")
		return
	case protoreflect.BytesKind:
		panic("bytes not supported")
	case protoreflect.MessageKind, protoreflect.GroupKind:
		g.P(prefix, fieldsObjName, ` = `, receiver, ".ToJSON()")
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
func oneOfToJSON(fieldsObjName string, prefix string, g *protogen.GeneratedFile, oneOf *protogen.Oneof) {
	name := JSONCamelCase(string(oneOf.Desc.Name()))

	parentTypeName := oneOf.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	receiver := parentReceiver + "." + oneOf.GoName

	g.P(prefix, name, " := map[string]*json.Node{}")
	g.P(prefix, "switch val := ", receiver, ".(type) {")
	for _, f := range oneOf.Fields {
		gnoType, _ := fieldGnoType(g, f)
		g.P(prefix, "case ", gnoType, ":")
		g.P(prefix, "	", name+`["case"] = json.StringNode("", `, strconv.Quote(f.Desc.JSONName()), ")")
		oneOfFieldToJSON(name+`["value"]`, "val", prefix+"	", g, f)
	}
	g.P(prefix, "default:")
	g.P(prefix, `	panic(errors.New("unknown `, name, ` variant"))`)
	g.P(prefix, "}")
	g.P(prefix, fieldsObjName, "[", strconv.Quote(name), `] = json.ObjectNode("", `, name, ")")
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
