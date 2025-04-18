package batchprofile

import (
	"errors"
	"std"

	"gno.land/p/demo/json"
	"gno.land/p/demo/ufmt"
	zenaov1 "gno.land/p/zenao/zenao/v1"
	"gno.land/r/demo/profile"
)

func Query(req *zenaov1.BatchProfileRequest) [][]interface{} {
	res := make([][]interface{}, len(req.Addresses))
	for i, addr := range req.Addresses {
		res[i] = make([]interface{}, len(req.Fields))
		for j, field := range req.Fields {
			switch field.Type {
			case "string":
				res[i][j] = profile.GetStringField(std.Address(addr), field.Key, "")
			case "bool":
				res[i][j] = profile.GetBoolField(std.Address(addr), field.Key, false)
			case "int":
				res[i][j] = profile.GetIntField(std.Address(addr), field.Key, 0)
			default:
				panic(ufmt.Errorf("invalid field type %q", field.Type))
			}
		}
	}
	return res
}

func queryJSON(reqJSON string) string {
	j, err := json.UnmarshalSafe([]byte(reqJSON))
	if err != nil {
		panic(err)
	}
	req := &zenaov1.BatchProfileRequest{}
	req.FromJSON(j)

	res := Query(req)
	elems := make([]*json.Node, len(res))
	for i, profile := range res {
		row := make([]*json.Node, len(profile))
		for j, field := range profile {
			switch val := field.(type) {
			case string:
				row[j] = json.StringNode("", val)
			case int:
				row[j] = json.NumberNode("", float64(val))
			case bool:
				row[j] = json.BoolNode("", val)
			default:
				panic(errors.New("unexpected internal field type, should not happen"))
			}
		}
		elems[i] = json.ArrayNode("", row)
	}
	bz, err := json.Marshal(json.ArrayNode("", elems))
	if err != nil {
		panic(err)
	}
	return string(bz)
}
