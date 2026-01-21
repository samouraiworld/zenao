package main

import (
	"database/sql"
	"testing"

	"github.com/samouraiworld/zenao/backend/ztesting"
	"github.com/stretchr/testify/require"
)

func TestOrdersTicketIssueColumnsExist(t *testing.T) {
	_, sqlDB := ztesting.SetupTestDB(t)

	columns := fetchTableColumns(t, sqlDB, "orders")
	require.Contains(t, columns, "ticket_issue_status")
	require.Contains(t, columns, "ticket_issue_error")
}

func TestSoldTicketsForeignKeysExist(t *testing.T) {
	_, sqlDB := ztesting.SetupTestDB(t)

	foreignKeys := fetchTableForeignKeys(t, sqlDB, "sold_tickets")
	require.Contains(t, foreignKeys, "order_id")
	require.Contains(t, foreignKeys, "order_attendee_id")
}

func fetchTableColumns(t *testing.T, db *sql.DB, table string) map[string]struct{} {
	t.Helper()

	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	require.NoError(t, err)
	defer rows.Close()

	cols := map[string]struct{}{}
	for rows.Next() {
		var (
			cid       int
			name      string
			ctype     string
			notnull   int
			dfltValue sql.NullString
			pk        int
		)
		require.NoError(t, rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk))
		cols[name] = struct{}{}
	}
	require.NoError(t, rows.Err())
	return cols
}

func fetchTableForeignKeys(t *testing.T, db *sql.DB, table string) map[string]struct{} {
	t.Helper()

	rows, err := db.Query("PRAGMA foreign_key_list(" + table + ")")
	require.NoError(t, err)
	defer rows.Close()

	cols := map[string]struct{}{}
	for rows.Next() {
		var (
			id       int
			seq      int
			tableRef string
			fromCol  string
			toCol    string
			onUpdate sql.NullString
			onDelete sql.NullString
			match    sql.NullString
		)
		require.NoError(t, rows.Scan(&id, &seq, &tableRef, &fromCol, &toCol, &onUpdate, &onDelete, &match))
		cols[fromCol] = struct{}{}
	}
	require.NoError(t, rows.Err())
	return cols
}
