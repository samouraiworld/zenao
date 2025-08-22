package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
)

// QueryProto

func QueryString(client *gnoclient.Client, cfg gnoclient.QueryCfg) (string, error) {
	queryResult, err := client.Query(cfg)
	if err != nil {
		return "", fmt.Errorf("query %q: %w", cfg.Path+":"+string(cfg.Data), err)
	}
	if queryResult.Response.Error != nil {
		return "", fmt.Errorf("query %q: returned error: %w", cfg.Path+":"+string(cfg.Data), err)
	}
	res, err := ParseStringResponse(queryResult.Response.Data)
	if err != nil {
		return "", fmt.Errorf("query %q: parse string in response %q: %w", cfg.Path+":"+string(cfg.Data), string(queryResult.Response.Data), err)
	}
	return res, nil
}

func QueryBytes(client *gnoclient.Client, cfg gnoclient.QueryCfg) ([]byte, error) {
	queryResult, err := client.Query(cfg)
	if err != nil {
		return nil, fmt.Errorf("query %q: %w", cfg.Path+":"+string(cfg.Data), err)
	}
	if queryResult.Response.Error != nil {
		return nil, fmt.Errorf("query %q: returned error: %w", cfg.Path+":"+string(cfg.Data), err)
	}
	res, err := ParseBytesResponse(queryResult.Response.Data)
	if err != nil {
		return nil, fmt.Errorf("query %q: parse string in response %q: %w", cfg.Path+":"+string(cfg.Data), string(queryResult.Response.Data), err)
	}
	return res, nil
}

func QueryBool(client *gnoclient.Client, cfg gnoclient.QueryCfg) (bool, error) {
	queryResult, err := client.Query(cfg)
	if err != nil {
		return false, fmt.Errorf("query %q: %w", cfg.Path+":"+string(cfg.Data), err)
	}
	if queryResult.Response.Error != nil {
		return false, fmt.Errorf("query %q: returned error: %w", cfg.Path+":"+string(cfg.Data), err)
	}
	return ParseBoolResponse(queryResult.Response.Data), nil
}

func QueryJSON(client *gnoclient.Client, cfg gnoclient.QueryCfg, dst interface{}) error {
	j, err := QueryString(client, cfg)
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(j), dst)
}

func ParseStringResponse(bz []byte) (string, error) {
	s := string(bz)
	s = strings.TrimPrefix(s, "(")
	s = strings.TrimSuffix(s, " string)")
	return strconv.Unquote(s)
}

func ParseBytesResponse(bz []byte) ([]byte, error) {
	s := string(bz)
	s = strings.TrimPrefix(s, "(array[0x")
	end := strings.Index(s, "]")
	if end == -1 {
		return nil, fmt.Errorf("can't find byte array end char ']' in %q", s)
	}
	return hex.DecodeString(s[:end])
}

func ParseBoolResponse(bz []byte) bool {
	s := string(bz)
	s = strings.TrimPrefix(s, "(")
	s = strings.TrimSuffix(s, " bool)")
	return s == "true"
}

func ParseUint64Response(bz []byte) (uint64, error) {
	s := string(bz)
	s = strings.TrimPrefix(s, "(")
	s = strings.TrimSuffix(s, " uint64)")
	return strconv.ParseUint(s, 10, 64)
}
