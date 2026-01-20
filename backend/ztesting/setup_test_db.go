package ztesting

import (
	"database/sql"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/samouraiworld/zenao/migrations"
	"github.com/stretchr/testify/require"
)

func SetupTestDB(t *testing.T) (zeni.DB, *sql.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := sql.Open("sqlite3", dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	applyMigrations(t, sqlDB)

	db, err := gzdb.SetupDB(dbPath)
	require.NoError(t, err)
	return db, sqlDB
}

func applyMigrations(t *testing.T, db *sql.DB) {
	t.Helper()

	entries, err := migrations.Migrations.ReadDir(".")
	require.NoError(t, err)

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		files = append(files, filepath.Join(".", entry.Name()))
	}
	sort.Strings(files)

	for _, path := range files {
		contents, err := migrations.Migrations.ReadFile(path)
		require.NoError(t, err)
		if strings.TrimSpace(string(contents)) == "" {
			continue
		}
		_, err = db.Exec(string(contents))
		require.NoErrorf(t, err, "apply migration %s", path)
	}
}
