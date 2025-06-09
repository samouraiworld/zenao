package treescaling

import (
	"strconv"

	"gno.land/p/demo/avl"
)

var (
	tree *avl.Tree
)

// Initialize populates the tree with n entries
func Initialize(n int64) {
	tree = avl.NewTree()
	for i := int64(0); i < n; i++ {
		key := "key_" + strconv.FormatInt(i, 10)
		value := "value_" + strconv.FormatInt(i, 10)
		tree.Set(key, value)
	}
}

// ReadKey reads a specific key from the tree
// This function is used to measure read operation gas cost
func ReadKey(key string) string {
	value, exists := tree.Get(key)
	if !exists {
		return "key not found"
	}
	return value.(string)
}

// WriteKey writes a specific key to the tree
// This function is used to measure write operation gas cost
func WriteKey(key, value string) {
	tree.Set(key, value)
}
