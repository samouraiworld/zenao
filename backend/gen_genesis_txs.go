package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/gnoland"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/gnovm"
	"github.com/gnolang/gno/gnovm/pkg/gnolang"
	"github.com/gnolang/gno/tm2/pkg/amino"
	"github.com/gnolang/gno/tm2/pkg/commands"
	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/std"
	"github.com/samouraiworld/zenao/backend/gzdb"
	"github.com/samouraiworld/zenao/backend/mapsl"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

// FORMAT OF THE FILE IS:

// {"tx": {"msg":[{"@type":"/vm.m_call","caller":"g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj","send":"1000000ugnot","pkg_path":"gno.land/r/gnoland/users/v1","func":"Register","args":["administrator123"]}],"fee":{"gas_wanted":"2000000","gas_fee":"1000000ugnot"},"signatures":[{"pub_key":{"@type":"/tm.PubKeySecp256k1","value":"AmG6kzznyo1uNqWPAYU6wDpsmzQKDaEOrVRaZ08vOyX0"},"signature":""}],"memo":""}}
// {"tx": {"msg":[{"@type":"/vm.m_call","caller":"g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj","send":"1000000ugnot","pkg_path":"gno.land/r/gnoland/users/v1","func":"Register","args":["administrator123"]}],"fee":{"gas_wanted":"2000000","gas_fee":"1000000ugnot"},"signatures":[{"pub_key":{"@type":"/tm.PubKeySecp256k1","value":"AmG6kzznyo1uNqWPAYU6wDpsmzQKDaEOrVRaZ08vOyX0"},"signature":""}],"memo":""}}
// ...

func newGenGenesisTxsCmd() *commands.Command {
	return commands.NewCommand(
		commands.Metadata{
			Name:       "gen-genesis-txs",
			ShortUsage: "gen-genesis-txs",
			ShortHelp:  "generate genesis transactions",
		},
		&genGenesisTxsConf,
		func(ctx context.Context, args []string) error {
			return execGenGenesisTxs()
		},
	)
}

var genGenesisTxsConf genGenesisTxsConfig

type genGenesisTxsConfig struct {
	adminMnemonic string
	chainId       string
	outputFile    string
	dbPath        string
}

func (conf *genGenesisTxsConfig) RegisterFlags(flset *flag.FlagSet) {
	flset.StringVar(&genGenesisTxsConf.chainId, "chain-id", "dev", "Chain ID")
	flset.StringVar(&genGenesisTxsConf.adminMnemonic, "admin-mnemonic", "cousin grunt dynamic dune such gold trim fuel route friend plastic rescue sweet analyst math shoe toy limit combine defense result teach weather antique", "Zenao admin mnemonic")
	flset.StringVar(&genGenesisTxsConf.dbPath, "db", "dev.db", "DB, can be a file or a libsql dsn")
	flset.StringVar(&genGenesisTxsConf.outputFile, "output", "genesis_txs.jsonl", "Output file")
}

func execGenGenesisTxs() error {
	logger, err := zap.NewDevelopment()
	if err != nil {
		return err
	}

	signer, err := gnoclient.SignerFromBip39(genGenesisTxsConf.adminMnemonic, "dev", "", 0, 0)
	if err != nil {
		return err
	}
	signerInfo, err := signer.Info()
	if err != nil {
		return err
	}
	signerFromKeybase, ok := signer.(*gnoclient.SignerFromKeybase)
	if !ok {
		return errors.New("signer is not a SignerFromKeybase")
	}
	privKey, err := signerFromKeybase.Keybase.ExportPrivKey(signerInfo.GetName(), "")
	if err != nil {
		return err
	}

	db, err := gzdb.SetupDB(genGenesisTxsConf.dbPath)
	if err != nil {
		return err
	}

	// first commit on zenao was on 15th of January 2025
	// TODO: make it a cli arg later
	genesisTime := time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC)
	txs, err := createAdminProfileGenesisTx(logger, signerInfo.GetAddress(), genesisTime)
	if err != nil {
		return err
	}

	users, err := db.GetAllUsers()
	if err != nil {
		return err
	}

	for _, user := range users {
		uRealm, err := generateUserRealmSource(user, "zenao", signerInfo.GetAddress().String())
		if err != nil {
			return err
		}
		userPkgPath := fmt.Sprintf("gno.land/r/zenao/u%s", user.ID)
		userTx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgAddPackage{
					Creator: signerInfo.GetAddress(),
					Deposit: []std.Coin{},
					Package: &gnovm.MemPackage{
						Name:  "user",
						Path:  userPkgPath,
						Files: []*gnovm.MemFile{{Name: "user.gno", Body: uRealm}},
					},
				},
			},
			Fee: std.Fee{
				GasWanted: 10000000,
				GasFee:    std.NewCoin("ugnot", 1000000),
			},
		}
		txs = append(txs, gnoland.TxWithMetadata{
			Tx: userTx,
			Metadata: &gnoland.GnoTxMetadata{
				Timestamp: time.Now().Unix(),
			},
		})
	}

	events, err := db.GetAllEvents()
	if err != nil {
		return err
	}
	for _, event := range events {
		sk, err := zeni.EventSKFromPasswordHash(event.PasswordHash)
		if err != nil {
			return err
		}
		privacy, err := zeni.EventPrivacyFromSK(sk)
		if err != nil {
			return err
		}
		organizers, err := db.GetEventUsersWithRole(event.ID, "organizer")
		if err != nil {
			return err
		}
		var organizersIDs []string
		for _, org := range organizers {
			organizersIDs = append(organizersIDs, org.ID)
		}

		organizersAddr := mapsl.Map(organizersIDs, func(id string) string {
			return gnolang.DerivePkgAddr(fmt.Sprintf("gno.land/r/zenao/u%s", id)).String()
		})

		eRealm, err := generateEventRealmSource(organizersAddr, signerInfo.GetAddress().String(), "zenao", &zenaov1.CreateEventRequest{
			Title:       event.Title,
			Description: event.Description,
			ImageUri:    event.ImageURI,
			Location:    event.Location,
		}, privacy)
		if err != nil {
			return err
		}
		eventPkgPath := fmt.Sprintf("gno.land/r/zenao/e%s", event.ID)
		eventTx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgAddPackage{
					Creator: signerInfo.GetAddress(),
					Deposit: []std.Coin{},
					Package: &gnovm.MemPackage{
						Name:  "event",
						Path:  eventPkgPath,
						Files: []*gnovm.MemFile{{Name: "event.gno", Body: eRealm}},
					},
				},
			},
			Fee: std.Fee{
				GasWanted: 10000000,
				GasFee:    std.NewCoin("ugnot", 1000000),
			},
		}

		txs = append(txs, gnoland.TxWithMetadata{
			Tx: eventTx,
			Metadata: &gnoland.GnoTxMetadata{
				Timestamp: event.CreatedAt.Unix(),
			},
		})
	}
	if err := gnoland.SignGenesisTxs(txs, privKey, genGenesisTxsConf.chainId); err != nil {
		return err
	}

	file, err := os.Create(genGenesisTxsConf.outputFile)
	if err != nil {
		return err
	}
	for _, tx := range txs {
		encodedTx, err := amino.MarshalJSON(tx)
		if err != nil {
			return err
		}

		_, err = file.WriteString(fmt.Sprintf("%s\n", encodedTx))
		if err != nil {
			return err
		}
	}

	return nil
}

func createAdminProfileGenesisTx(logger *zap.Logger, addr crypto.Address, genesisTime time.Time) ([]gnoland.TxWithMetadata, error) {
	txs := make([]gnoland.TxWithMetadata, 0)
	registerTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  addr,
				Send:    std.NewCoins(std.NewCoin("ugnot", 20_000_000)),
				PkgPath: "gno.land/r/demo/users",
				Func:    "Register",
				Args:    []string{"", "zenaoadm", ""},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	txs = append(txs, gnoland.TxWithMetadata{
		Tx: registerTx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: genesisTime.Unix(),
		},
	})

	kv := [][2]string{
		{"DisplayName", "Zenao Admin"},
		{"Avatar", userDefaultAvatar},
		{"Bio", "This is the root zenao admin, it is responsible for managing accounts until they become self-custodial"},
	}

	for _, field := range kv {
		setFieldTx := std.Tx{
			Msgs: []std.Msg{
				vm.MsgCall{
					Caller:  addr,
					PkgPath: "gno.land/r/demo/profile",
					Func:    "SetStringField",
					Args:    []string{field[0], field[1]},
				},
			},
			Fee: std.Fee{
				GasWanted: 10000000,
				GasFee:    std.NewCoin("ugnot", 1000000),
			},
		}

		txs = append(txs, gnoland.TxWithMetadata{
			Tx: setFieldTx,
			Metadata: &gnoland.GnoTxMetadata{
				Timestamp: genesisTime.Unix(),
			},
		})
	}

	return txs, nil
}
