package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
)

func applyMigrationsForPriceTests(t *testing.T, migrationsDir string, db *sql.DB) {
	t.Helper()

	entries, err := os.ReadDir(migrationsDir)
	require.NoError(t, err)

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		files = append(files, filepath.Join(migrationsDir, entry.Name()))
	}
	sort.Strings(files)

	for _, path := range files {
		contents, err := os.ReadFile(path)
		require.NoError(t, err)
		if strings.TrimSpace(string(contents)) == "" {
			continue
		}
		_, err = db.Exec(string(contents))
		require.NoErrorf(t, err, "apply migration %s", path)
	}
}

func tableColumns(t *testing.T, db *sql.DB, table string) map[string]struct{} {
	t.Helper()

	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	require.NoError(t, err)
	defer rows.Close()

	columns := make(map[string]struct{})
	for rows.Next() {
		var cid int
		var name string
		var colType string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		require.NoError(t, rows.Scan(&cid, &name, &colType, &notNull, &defaultValue, &pk))
		columns[name] = struct{}{}
	}
	require.NoError(t, rows.Err())
	return columns
}

func TestPriceGroupSchemaCreated(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := sql.Open("sqlite3", dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	migrationsDir := filepath.Join("..", "migrations")
	if _, err := os.Stat(migrationsDir); err != nil {
		migrationsDir = "migrations"
	}
	applyMigrationsForPriceTests(t, migrationsDir, sqlDB)

	columns := tableColumns(t, sqlDB, "price_groups")
	for _, name := range []string{"id", "event_id", "capacity", "created_at", "updated_at", "deleted_at"} {
		_, ok := columns[name]
		require.Truef(t, ok, "expected column %q in price_groups", name)
	}
}

func TestPricesSchemaCreated(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := sql.Open("sqlite3", dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	migrationsDir := filepath.Join("..", "migrations")
	if _, err := os.Stat(migrationsDir); err != nil {
		migrationsDir = "migrations"
	}
	applyMigrationsForPriceTests(t, migrationsDir, sqlDB)

	columns := tableColumns(t, sqlDB, "prices")
	for _, name := range []string{"id", "price_group_id", "amount_minor", "currency_code", "payment_account_id", "created_at", "updated_at", "deleted_at"} {
		_, ok := columns[name]
		require.Truef(t, ok, "expected column %q in prices", name)
	}
}
