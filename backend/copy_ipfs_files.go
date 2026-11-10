package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newCopyIPFSFilesCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "copy-ipfs-files",
			ShortUsage: "copy-ipfs-files [flags]",
			ShortHelp:  "copy every IPFS file referenced in the database from the kubo node to Pinata",
			LongHelp: "Reads each CID referenced in the database from the kubo node and uploads it to Pinata " +
				"with the same parameters, then checks that Pinata returns the same CID. " +
				"Use it to move back to Pinata (see README). Run it where the kubo RPC API is reachable.",
		},
		&copyIPFSFilesConf,
		func(ctx context.Context, args []string) error {
			return copyIPFSFiles(ctx)
		},
	)
}

var copyIPFSFilesConf = copyIPFSFilesConfig{}

type copyIPFSFilesConfig struct {
	dbPath      string
	ipfsAPIURL  string
	pinataJWT   string
	pinataGroup string
	dryRun      bool
}

func (conf *copyIPFSFilesConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&conf.dbPath, "db", "dev.db", "path to the SQLite database or a libsql DSN (libsql://...?authToken=...)")
	flset.StringVar(&conf.ipfsAPIURL, "ipfs-api-url", defaultIPFSAPIURL, "kubo RPC API URL (or set ZENAO_IPFS_API_URL env var)")
	flset.StringVar(&conf.pinataJWT, "pinata-jwt", "", "Pinata API JWT (or set ZENAO_PINATA_JWT env var)")
	flset.StringVar(&conf.pinataGroup, "pinata-group", "", "optional Pinata group ID (or set ZENAO_PINATA_GROUP env var)")
	flset.BoolVar(&conf.dryRun, "dry-run", false, "list CIDs and check they are on the kubo node, without uploading")
}

func copyIPFSFiles(ctx context.Context) error {
	conf := &copyIPFSFilesConf
	if val := os.Getenv("ZENAO_DB"); val != "" && conf.dbPath == "dev.db" {
		conf.dbPath = val
	}
	// Environment variables apply only when the flag is not set.
	if val := os.Getenv("ZENAO_IPFS_API_URL"); val != "" && conf.ipfsAPIURL == defaultIPFSAPIURL {
		conf.ipfsAPIURL = val
	}
	if val := os.Getenv("ZENAO_PINATA_JWT"); val != "" && conf.pinataJWT == "" {
		conf.pinataJWT = val
	}
	if val := os.Getenv("ZENAO_PINATA_GROUP"); val != "" && conf.pinataGroup == "" {
		conf.pinataGroup = val
	}
	if !conf.dryRun && conf.pinataJWT == "" {
		return fmt.Errorf("-pinata-jwt or ZENAO_PINATA_JWT env var is required")
	}

	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	var db *gorm.DB
	if strings.HasPrefix(conf.dbPath, "libsql") {
		db, err = gorm.Open(sqlite.New(sqlite.Config{
			DriverName: "libsql",
			DSN:        conf.dbPath,
		}), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open(conf.dbPath), &gorm.Config{})
	}
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	cids, err := collectAllIPFSCIDs(db)
	if err != nil {
		return fmt.Errorf("collect CIDs: %w", err)
	}
	logger.Info("collected unique IPFS CIDs", zap.Int("count", len(cids)))

	kubo := &kuboFileStore{apiURL: strings.TrimSuffix(conf.ipfsAPIURL, "/"), client: newFileStoreHTTPClient()}
	var pinata FileStore
	if !conf.dryRun {
		pinata = &pinataFileStore{apiURL: defaultPinataAPIURL, jwt: conf.pinataJWT, group: conf.pinataGroup, client: newFileStoreHTTPClient()}
	}

	res := copyFiles(ctx, logger, cids, kubo, pinata)
	logger.Info("done",
		zap.Int("copied", res.copied),
		zap.Int("missing-on-kubo", res.missing),
		zap.Int("failed", res.failed),
	)
	if res.failed > 0 {
		return fmt.Errorf("%d file(s) failed to copy", res.failed)
	}
	return nil
}

type copyFilesResult struct {
	copied  int
	missing int
	failed  int
}

// copyFiles reads each CID from the kubo node and adds it to dst. A nil dst
// only checks that the CIDs are on the kubo node. CIDs that the kubo node does
// not hold (files lost with the former Pinata account) are counted as missing
// and do not fail the copy: they are missing on both sides.
func copyFiles(ctx context.Context, logger *zap.Logger, cids []string, src *kuboFileStore, dst FileStore) copyFilesResult {
	var res copyFilesResult
	for _, cid := range cids {
		data, err := src.Cat(ctx, cid)
		if errors.Is(err, errNotOnNode) {
			logger.Warn("not on the kubo node", zap.String("cid", cid))
			res.missing++
			continue
		}
		if err != nil {
			logger.Error("failed to read from the kubo node", zap.String("cid", cid), zap.Error(err))
			res.failed++
			continue
		}
		if dst == nil {
			logger.Info("on the kubo node", zap.String("cid", cid), zap.Int("size", len(data)))
			continue
		}

		got, err := dst.Add(ctx, cid, data)
		switch {
		case err != nil:
			logger.Error("failed to copy", zap.String("cid", cid), zap.Error(err))
			res.failed++
		case !sameCID(got, cid):
			logger.Error("copied with a different CID", zap.String("cid", cid), zap.String("got", got))
			res.failed++
		default:
			logger.Info("copied", zap.String("cid", cid))
			res.copied++
		}
	}
	return res
}

// ipfsURIRe matches an ipfs:// URI and captures the CID: base32 or base58
// characters only, so that markdown such as ![x](ipfs://<cid>) or JSON
// strings do not leak into the CID.
var ipfsURIRe = regexp.MustCompile(`ipfs://([A-Za-z0-9]+)`)

// sameCID reports whether a and b are the same content, whatever their CID
// version or multibase encoding.
func sameCID(a, b string) bool {
	ca, errA := cid.Decode(a)
	cb, errB := cid.Decode(b)
	if errA != nil || errB != nil {
		return a == b
	}
	return cid.NewCidV1(ca.Type(), ca.Hash()).Equals(cid.NewCidV1(cb.Type(), cb.Hash()))
}

// extractIPFSCIDs returns the valid CIDs of the ipfs:// URIs found in text.
// Free text can hold ipfs:// strings that are not CIDs: they are skipped.
func extractIPFSCIDs(text string) []string {
	var cids []string
	for _, m := range ipfsURIRe.FindAllStringSubmatch(text, -1) {
		if _, err := cid.Decode(m[1]); err == nil {
			cids = append(cids, m[1])
		}
	}
	return cids
}

// staticCIDs lists hardcoded IPFS CIDs used as fallback images and email icons.
// These are not stored in the database so they must be copied explicitly.
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
// user-uploaded media.
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

// allFrontMatterIPFSCIDsQuery fetches text blobs that embed ipfs:// URIs:
// portfolio items as front-matter JSON (communities.description, users.bio)
// and markdown uploads (events.description, posts.content), so we can
// regex-scan them for URIs that the column-level query above would miss.
const allFrontMatterIPFSCIDsQuery = `
SELECT DISTINCT blob FROM (
	SELECT description AS blob FROM communities WHERE description LIKE '%ipfs://%'
	UNION ALL
	SELECT bio         AS blob FROM users        WHERE bio         LIKE '%ipfs://%'
	UNION ALL
	SELECT description AS blob FROM events       WHERE description LIKE '%ipfs://%'
	UNION ALL
	SELECT content     AS blob FROM posts        WHERE content     LIKE '%ipfs://%'
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
		// Keep the CID only: drop a "/path", "?query" or "#fragment" suffix.
		c := strings.TrimPrefix(uri, "ipfs://")
		if i := strings.IndexAny(c, "/?#"); i >= 0 {
			c = c[:i]
		}
		seen[c] = struct{}{}
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
		for _, cid := range extractIPFSCIDs(blob) {
			seen[cid] = struct{}{}
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
