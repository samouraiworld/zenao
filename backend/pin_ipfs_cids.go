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
	"regexp"
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
	flset.StringVar(&conf.dbPath, "db", "dev.db", "path to the SQLite database or a libsql DSN (libsql://...?authToken=...)")
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

	var db *gorm.DB
	if strings.HasPrefix(pinIPFSCIDsConf.dbPath, "libsql") {
		db, err = gorm.Open(sqlite.New(sqlite.Config{
			DriverName: "libsql",
			DSN:        pinIPFSCIDsConf.dbPath,
		}), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open(pinIPFSCIDsConf.dbPath), &gorm.Config{})
	}
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

// ipfsURIRe matches an ipfs:// URI and captures the CID (everything after the scheme
// up to a whitespace, double-quote, or backslash).
var ipfsURIRe = regexp.MustCompile(`ipfs://([^\s"\\]+)`)

// staticCIDs lists hardcoded IPFS CIDs used as fallback images and email icons.
// These are not stored in the database so they must be pinned explicitly.
var staticCIDs = []string{
	"bafybeidp4z4cywvdzoyqgdolcqmmxeug62qukpl3nfumjquqragxwr7bny", // profile banner fallback
	"bafybeib2gyk2yagrcdrnhpgbaj6an6ghk2liwx2mshhoa6d54y2mheny24", // community banner fallback
	"bafybeigirez6x4hn5ghchng5eoxoi2bkcglaybuz4np6joub6zja5om6l4", // manifesto architecture image
	"bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy", // default user avatar
	"bafkreifqabflxtsqvaggg2kw4lyju3pckq4osun4vdlltsn7lal7ak5hli", // mail logo
	"bafkreiaknq3mxzx5ulryv5tnikjkntmckvz3h4mhjyjle4zbtqkwhyb5xa", // mail calendar icon
	"bafkreidfskfo2ld3i75s3d2uf6asiena3jletbz5cy7ostihwoyjclceqa", // mail pin icon
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

// allFrontMatterIPFSCIDsQuery fetches text blobs that embed portfolio items as
// front-matter JSON (communities.description and users.bio), so we can regex-scan
// them for ipfs:// URIs that the column-level query above would miss.
const allFrontMatterIPFSCIDsQuery = `
SELECT DISTINCT blob FROM (
	SELECT description AS blob FROM communities WHERE description LIKE '%ipfs://%'
	UNION ALL
	SELECT bio         AS blob FROM users        WHERE bio         LIKE '%ipfs://%'
)`

func collectAllIPFSCIDs(db *gorm.DB) ([]string, error) {
	seen := make(map[string]struct{})

	// Collect CIDs from dedicated URI columns.
	rows, err := db.Raw(allIPFSCIDsQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var uri string
		if err := rows.Scan(&uri); err != nil {
			return nil, err
		}
		seen[strings.TrimPrefix(uri, "ipfs://")] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Collect CIDs embedded in front-matter blobs (portfolio items).
	fmRows, err := db.Raw(allFrontMatterIPFSCIDsQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer fmRows.Close()
	for fmRows.Next() {
		var blob string
		if err := fmRows.Scan(&blob); err != nil {
			return nil, err
		}
		for _, m := range ipfsURIRe.FindAllStringSubmatch(blob, -1) {
			seen[m[1]] = struct{}{}
		}
	}
	if err := fmRows.Err(); err != nil {
		return nil, err
	}

	for _, cid := range staticCIDs {
		seen[cid] = struct{}{}
	}

	cids := make([]string, 0, len(seen))
	for cid := range seen {
		cids = append(cids, cid)
	}
	return cids, nil
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
