package main

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"google.golang.org/protobuf/compiler/protogen"
	"google.golang.org/protobuf/reflect/protoreflect"
)

// TODO: Remove protoc gen gno ? (port on a standalone repo ?)
// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func fieldGnoType(g *protogen.GeneratedFile, field *protogen.Field) (goType string, pointer bool) {
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
	if field.Oneof != nil {
		return
	}

	if field.Desc.IsMap() {
		panic("map not supported")
	}

	name := strconv.Quote(field.Desc.JSONName())
	parentTypeName := field.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	accessor := parentReceiver + "." + field.GoName
	receiver := fieldsObjName + "[" + name + "]"
	isList := field.Desc.IsList()

	printField := func(zeroValue string, converter func(accessor string) string) {
		if isList {
			g.P(prefix, "if len(", accessor, ") != 0 {")
			g.P(prefix, `	arr := make([]*json.Node, len(`, accessor, `))`)
			g.P(prefix, `	for i, val := range `, accessor, ` {`)
			g.P(prefix, `		arr[i] = `, converter("val"))
			g.P(prefix, `	}`)
			g.P(prefix, `	`, receiver, ` = json.ArrayNode("", arr)`)
		} else {
			g.P(prefix, "if ", accessor, " != ", zeroValue, " {")
			g.P(prefix, `	`, receiver, ` = `, converter(accessor))
		}
		g.P(prefix, "}")
	}

	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		printField(`false`, func(accessor string) string {
			return `json.BoolNode("", ` + accessor + `)`
		})
	case protoreflect.EnumKind:
		printField(`0`, func(accessor string) string {
			return `json.StringNode("", ` + accessor + `.ToString())`
		})
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind, protoreflect.Uint32Kind, protoreflect.Fixed32Kind, protoreflect.FloatKind, protoreflect.DoubleKind:
		printField(`0`, func(accessor string) string {
			return `json.NumberNode("", float64(` + accessor + `))`
		})
	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		printField(`0`, func(accessor string) string {
			return `json.StringNode("", strconv.FormatInt(` + accessor + `, 10))`
		})
	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		printField(`0`, func(accessor string) string {
			return `json.StringNode("", strconv.FormatUint(` + accessor + `, 10))`
		})
	case protoreflect.StringKind:
		printField(`""`, func(accessor string) string {
			return `json.StringNode("", ` + accessor + `)`
		})
	case protoreflect.BytesKind:
		panic("bytes not supported")
	case protoreflect.MessageKind, protoreflect.GroupKind:
		printField(`nil`, func(accessor string) string {
			return accessor + `.ToJSON()`
		})
	default:
		panic(fmt.Errorf("unexpected field type %q", field.Desc.Kind().String()))
	}
}

// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func fieldFromJSON(prefix string, g *protogen.GeneratedFile, field *protogen.Field) {
	if field.Oneof != nil {
		return
	}

	if field.Desc.IsMap() {
		panic("map not supported")
		/*
			keyType, _ := fieldGoType(g, f, field.Message.Fields[0])
			valType, _ := fieldGoType(g, f, field.Message.Fields[1])
			return fmt.Sprintf("map[%v]%v", keyType, valType), false
		*/
	}

	gnoType, _ := fieldGnoType(g, field)
	name := strconv.Quote(field.Desc.JSONName())
	parentTypeName := field.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	receiver := parentReceiver + "." + field.GoName
	accessor := `fields[` + name + `]`

	printField := func(prelude string, converter string) {
		printPrelude := func(pp string) {
			if prelude != "" {
				lines := strings.Split(prelude, "\n")
				for _, line := range lines {
					g.P(prefix, pp, line)
				}
			}
		}

		g.P(prefix, `if val, ok := `, accessor, `; ok {`)
		if field.Desc.IsList() {
			g.P(prefix, `	jarr := val.MustArray()`)
			g.P(prefix, `	arr := make(`, gnoType, `, len(jarr))`)
			g.P(prefix, `	for i, val := range jarr {`)
			printPrelude(`		`)
			g.P(prefix, `		arr[i] = `, converter)
			g.P(prefix, `	}`)
			g.P(prefix, `	`, receiver, ` = arr`)
		} else {
			printPrelude(`	`)
			g.P(prefix, `	`, receiver, ` = `, converter)
		}
		g.P(prefix, `}`)
	}

	switch field.Desc.Kind() {
	case protoreflect.BoolKind:
		printField("", "val.MustBool()")
	case protoreflect.EnumKind:
		printField("", g.QualifiedGoIdent(field.Enum.GoIdent)+"FromString(val.MustString())")
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind:
		printField("", "int32(val.MustNumeric())")
	case protoreflect.Uint32Kind, protoreflect.Fixed32Kind:
		printField("", "uint32(val.MustNumeric())")
	case protoreflect.FloatKind:
		printField("", "float32(val.MustNumeric())")
	case protoreflect.DoubleKind:
		printField("", "val.MustNumeric()")
	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		printField("fv, err := strconv.ParseInt(val.MustString(), 10, 64);\nif err != nil {\n	panic(err)\n}", "fv")
	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		printField("fv, err := strconv.ParseUint(val.MustString(), 10, 64);\nif err != nil {\n	panic(err)\n}", "fv")
	case protoreflect.StringKind:
		printField("", "val.MustString()")
	case protoreflect.BytesKind:
		panic("bytes not supported")
	case protoreflect.MessageKind, protoreflect.GroupKind:
		printField("fv := &"+g.QualifiedGoIdent(field.Message.GoIdent)+"{}\n"+g.QualifiedGoIdent(field.Message.GoIdent)+"FromJSON(fv, val)", "fv")
	default:
		panic(fmt.Errorf("unexpected field type %q", field.Desc.Kind().String()))
	}
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

	g.P(prefix, "switch val := ", receiver, ".(type) {")
	for _, f := range oneOf.Fields {
		gnoType, _ := fieldGnoType(g, f)
		g.P(prefix, "case ", gnoType, ":")
		g.P(prefix, `	`, fieldsObjName, "[", strconv.Quote(f.Desc.JSONName()), `] = val.ToJSON()`)
	}
	g.P(prefix, "default:")
	g.P(prefix, `	panic(errors.New("unknown `, name, ` variant"))`)
	g.P(prefix, "}")
}

// fieldGnoType returns the Go type used for a field.
//
// If it returns pointer=true, the struct field is a pointer to the type.
//
// Ported from protogen
func oneOfFromJSON(fieldsObjName string, prefix string, g *protogen.GeneratedFile, oneOf *protogen.Oneof) {
	name := JSONCamelCase(string(oneOf.Desc.Name()))

	parentTypeName := oneOf.Parent.Desc.Name()
	parentReceiver := strings.ToLower(string(parentTypeName[0]))
	receiver := parentReceiver + "." + oneOf.GoName

	variants := []string{}
	for _, f := range oneOf.Fields {
		variants = append(variants, strconv.Quote(f.Desc.JSONName()))
	}
	g.P(prefix, `variantFieldNames := []string{`, strings.Join(variants, ", "), `}`)
	g.P(prefix, `var selectedVariant *json.Node`)
	g.P(prefix, `var selectedVariantName string`)
	g.P(prefix, `for _, variantName := range variantFieldNames {`)
	g.P(prefix, `	if variant, ok := fields[variantName]; ok {`)
	g.P(prefix, `		selectedVariantName = variantName`)
	g.P(prefix, `		selectedVariant = variant`)
	g.P(prefix, `	}`)
	g.P(prefix, `	break`)
	g.P(prefix, `}`)
	g.P(prefix, "switch selectedVariantName {")
	for _, f := range oneOf.Fields {
		variantKindVal := strconv.Quote(f.Desc.JSONName())
		// gnoType, _ := fieldGnoType(g, f)
		g.P(prefix, "case ", variantKindVal, ":")
		// XXX: suport all variant kinds, not only message
		if f.Message == nil {
			panic(errors.New("only message supported in oneof field fromjson"))
		}
		g.P(prefix, `	n := &`, g.QualifiedGoIdent(f.Message.GoIdent), `{}`)
		g.P(prefix, `	`, f.Message.GoIdent.GoName, `FromJSON(n, selectedVariant)`)
		g.P(prefix, `	`, receiver, " = n")
	}
	g.P(prefix, "default:")
	g.P(prefix, `	panic(errors.New("`, name, ` variant not found"))`)
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
