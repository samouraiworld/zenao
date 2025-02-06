//go:build tools

package tools

import (
	_ "ariga.io/atlas-provider-gorm/gormschema"
	_ "connectrpc.com/connect/cmd/protoc-gen-connect-go"
	_ "github.com/bufbuild/buf/cmd/buf"
	_ "github.com/fullstorydev/grpcurl/cmd/grpcurl"
	_ "google.golang.org/protobuf/cmd/protoc-gen-go"
)
