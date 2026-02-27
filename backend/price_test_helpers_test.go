package main

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/zeni"
	"github.com/stretchr/testify/require"
)

type priceStubAuth struct {
	user *zeni.AuthUser
}

func (a *priceStubAuth) GetUser(ctx context.Context) *zeni.AuthUser {
	return a.user
}

func (a *priceStubAuth) GetUsersFromIDs(ctx context.Context, ids []string) ([]*zeni.AuthUser, error) {
	return nil, nil
}

func (a *priceStubAuth) EnsureUserExists(ctx context.Context, email string) (*zeni.AuthUser, error) {
	return nil, nil
}

func (a *priceStubAuth) EnsureUsersExists(ctx context.Context, emails []string) ([]*zeni.AuthUser, error) {
	return nil, nil
}

func (a *priceStubAuth) WithAuth() func(http.Handler) http.Handler {
	return func(handler http.Handler) http.Handler { return handler }
}

func applyMigrationsForPriceRPCTests(t *testing.T, migrationsDir string, db *sql.DB) {
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

func setupPriceRPCDB(t *testing.T) zeni.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := sql.Open("sqlite3", dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	migrationsDir := filepath.Join("..", "migrations")
	if _, err := os.Stat(migrationsDir); err != nil {
		migrationsDir = "migrations"
	}
	applyMigrationsForPriceRPCTests(t, migrationsDir, sqlDB)

	db, err := gzdb.SetupDB(dbPath)
	require.NoError(t, err)
	return db
}
