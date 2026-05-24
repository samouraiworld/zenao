package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newPinIPFSCIDsCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "pin-ipfs-cids",
			ShortUsage: "pin-ipfs-cids [flags]",
			ShortHelp:  "pin all IPFS CIDs stored in the database to the current Pinata account",
		},
		&pinIPFSCIDsConf,
		func(ctx context.Context, args []string) error {
			return pinIPFSCIDs()
		},
	)
}

var pinIPFSCIDsConf = pinIPFSCIDsConfig{}

type pinIPFSCIDsConfig struct {
	dbPath    string
	pinataJWT string
	dryRun    bool
}

func (conf *pinIPFSCIDsConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.dbPath, "db", "dev.db", "path to the SQLite database")
	flset.StringVar(&conf.pinataJWT, "pinata-jwt", "", "Pinata API JWT token (or set PINATA_JWT env var)")
	flset.BoolVar(&conf.dryRun, "dry-run", false, "list CIDs without actually pinning them")
}

func pinIPFSCIDs() error {
	if val := os.Getenv("ZENAO_DB"); val != "" && pinIPFSCIDsConf.dbPath == "dev.db" {
		pinIPFSCIDsConf.dbPath = val
	}
	if val := os.Getenv("PINATA_JWT"); val != "" {
		pinIPFSCIDsConf.pinataJWT = val
	}
	if !pinIPFSCIDsConf.dryRun && pinIPFSCIDsConf.pinataJWT == "" {
		return fmt.Errorf("-pinata-jwt or PINATA_JWT env var is required")
	}

	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	db, err := gorm.Open(sqlite.Open(pinIPFSCIDsConf.dbPath), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	cids, err := collectAllIPFSCIDs(db)
	if err != nil {
		return fmt.Errorf("collect CIDs: %w", err)
	}
	logger.Info("collected unique IPFS CIDs", zap.Int("count", len(cids)))

	if pinIPFSCIDsConf.dryRun {
		for _, cid := range cids {
			fmt.Println(cid)
		}
		return nil
	}

	client := &http.Client{Timeout: 30 * time.Second}
	pinned, failed := 0, 0
	for _, cid := range cids {
		logger.Info("pinning", zap.String("cid", cid))
		if err := callPinByHash(client, pinIPFSCIDsConf.pinataJWT, cid); err != nil {
			logger.Error("failed to pin", zap.String("cid", cid), zap.Error(err))
			failed++
		} else {
			pinned++
		}
	}

	logger.Info("done", zap.Int("pinned", pinned), zap.Int("failed", failed))
	if failed > 0 {
		return fmt.Errorf("%d CID(s) failed to pin", failed)
	}
	return nil
}

// allIPFSCIDsQuery collects every distinct ipfs:// URI across all tables that store
// user-uploaded media, so we can pin them all to the current Pinata account.
const allIPFSCIDsQuery = `
SELECT DISTINCT uri FROM (
	SELECT avatar_uri          AS uri FROM users        WHERE avatar_uri          LIKE 'ipfs://%'
	UNION
	SELECT image_uri                   FROM events       WHERE image_uri           LIKE 'ipfs://%'
	UNION
	SELECT avatar_uri                  FROM communities  WHERE avatar_uri          LIKE 'ipfs://%'
	UNION
	SELECT banner_uri                  FROM communities  WHERE banner_uri          LIKE 'ipfs://%'
	UNION
	SELECT preview_image_uri           FROM posts        WHERE preview_image_uri   LIKE 'ipfs://%'
	UNION
	SELECT image_uri                   FROM posts        WHERE image_uri           LIKE 'ipfs://%'
	UNION
	SELECT audio_uri                   FROM posts        WHERE audio_uri           LIKE 'ipfs://%'
	UNION
	SELECT video_uri                   FROM posts        WHERE video_uri           LIKE 'ipfs://%'
	UNION
	SELECT thumbnail_image_uri         FROM posts        WHERE thumbnail_image_uri LIKE 'ipfs://%'
)`

func collectAllIPFSCIDs(db *gorm.DB) ([]string, error) {
	rows, err := db.Raw(allIPFSCIDsQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cids []string
	for rows.Next() {
		var uri string
		if err := rows.Scan(&uri); err != nil {
			return nil, err
		}
		cids = append(cids, strings.TrimPrefix(uri, "ipfs://"))
	}
	return cids, rows.Err()
}

type pinByHashBody struct {
	HashToPin     string     `json:"hashToPin"`
	PinataOptions pinataOpts `json:"pinataOptions"`
}

type pinataOpts struct {
	CIDVersion int `json:"cidVersion"`
}

// callPinByHash queues a CID to be pinned to the Pinata account associated with
// jwt. The operation is asynchronous: Pinata fetches the content from the IPFS
// network in the background after this call returns.
func callPinByHash(client *http.Client, jwt, cid string) error {
	body, err := json.Marshal(pinByHashBody{
		HashToPin:     cid,
		PinataOptions: pinataOpts{CIDVersion: 1},
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.pinata.cloud/pinning/pinByHash", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pinata returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}
