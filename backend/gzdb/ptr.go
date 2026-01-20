package gzdb

import "fmt"

func uintPtrToString(val *uint) string {
	if val == nil {
		return ""
	}

	return fmt.Sprint(*val)
}
