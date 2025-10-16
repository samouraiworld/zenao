package gzchain

import (
	"errors"
	"fmt"
	"os"
	"slices"
	"time"

	"github.com/gnolang/gno/gno.land/pkg/gnoclient"
	"github.com/gnolang/gno/gno.land/pkg/gnoland"
	"github.com/gnolang/gno/gno.land/pkg/sdk/vm"
	"github.com/gnolang/gno/tm2/pkg/amino"
	cryptoGno "github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/std"
	tm2std "github.com/gnolang/gno/tm2/pkg/std"
	feedsv1 "github.com/samouraiworld/zenao/backend/feeds/v1"
	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
)

// TODO: REMOVE WHEN SOT TRANSITION IS DONE

func GentxNewPost(chain *gnoZenaoChain, authorRealmID string, caller string, orgRealmID string, post *feedsv1.Post) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	feedID := orgRealmID + ":main"
	gnoLitPost := "&" + post.GnoLiteral("feedsv1.", "\t\t")
	body := genCreatePostMsgRunBody(authorRealmID, feedID, gnoLitPost)

	stdtx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: callerAddr,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	tx := gnoland.TxWithMetadata{
		Tx: stdtx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: post.CreatedAt,
		},
	}

	return tx, nil
}

func GentxReactPost(chain *gnoZenaoChain, authorRealmID string, caller string, orgRealmID string, reaction *zenaov1.ReactPostRequest, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	body := genReactPostMsgRunBody(authorRealmID, reaction.PostId, reaction.Icon)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: callerAddr,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func GentxPollVote(chain *gnoZenaoChain, authorRealmID string, caller string, pollID string, vote *zenaov1.VotePollRequest, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	body := genVotePollMsgRunBody(authorRealmID, pollID, vote.Option)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: callerAddr,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func GentxNewPoll(chain *gnoZenaoChain, authorRealmID string, caller string, orgRealmID string, poll *zenaov1.CreatePollRequest, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	feedID := orgRealmID + ":main"
	body := genCreatePollMsgRunBody(orgRealmID, authorRealmID, feedID, poll.Question, poll.Options, poll.Kind, poll.Duration)
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgRun{
				Caller: callerAddr,
				Send:   []std.Coin{},
				Package: &tm2std.MemPackage{
					Name:  "main",
					Files: []*tm2std.MemFile{{Name: "main.gno", Body: body}},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func GentxEventReg(chain *gnoZenaoChain, evtRealmID string, caller string, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  callerAddr,
				Send:    []std.Coin{},
				PkgPath: chain.eventsIndexPkgPath,
				Func:    "IndexEvent",
				Args:    []string{evtRealmID},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp, // +1 to avoid collision with event creation
		},
	}, nil
}

func GentxEventRealm(chain *gnoZenaoChain, eventRealmID string, eventReq *zenaov1.CreateEventRequest, caller string, organizersRealmIDs []string, gatekeepersRealmIDs []string, privacy *zenaov1.EventPrivacy, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	eRealm, err := genEventRealmSource(organizersRealmIDs, gatekeepersRealmIDs, caller, chain.namespace, &zenaov1.CreateEventRequest{
		Title:        eventReq.Title,
		Description:  eventReq.Description,
		ImageUri:     eventReq.ImageUri,
		Location:     eventReq.Location,
		StartDate:    eventReq.StartDate,
		EndDate:      eventReq.EndDate,
		Capacity:     eventReq.Capacity,
		Discoverable: eventReq.Discoverable,
	}, privacy)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	eventTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: callerAddr,
				Send:    []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "event",
					Path: eventRealmID,
					Files: []*tm2std.MemFile{
						{Name: "event.gno", Body: eRealm},
						{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", eventRealmID)},
					},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: eventTx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func GentxUserRealm(chain *gnoZenaoChain, userRealmID string, user *zeni.User, caller string, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	uRealm, err := genUserRealmSource(user, chain.namespace, caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	userTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: callerAddr,
				Send:    []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "user",
					Path: userRealmID,
					Files: []*tm2std.MemFile{
						{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", userRealmID)},
						{Name: "user.gno", Body: uRealm},
					},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: userTx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func GentxAdminProfile(admin string, genesisTime time.Time) ([]gnoland.TxWithMetadata, error) {
	txs := make([]gnoland.TxWithMetadata, 0)
	addr, err := cryptoGno.AddressFromString(admin)
	if err != nil {
		return nil, err
	}
	registerTx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  addr,
				Send:    std.NewCoins(std.NewCoin("ugnot", 1_000_000)),
				PkgPath: "gno.land/r/gnoland/users/v1",
				Func:    "Register",
				Args:    []string{"zenaoadm4242"},
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

func GentxCommunityReg(chain *gnoZenaoChain, admin string, communityRealmID string, timestamp int64) (gnoland.TxWithMetadata, error) {
	adminAddr, err := cryptoGno.AddressFromString(admin)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgCall{
				Caller:  adminAddr,
				Send:    []std.Coin{},
				PkgPath: chain.communitiesIndexPkgPath,
				Func:    "IndexCommunity",
				Args:    []string{communityRealmID},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func GentxCommunityRealm(chain *gnoZenaoChain, caller string, cmtRealmID string, cmtReq *zenaov1.CreateCommunityRequest, administratorsRealmIDs []string, membersRealmIDs []string, eventsRealmIDs []string, timestamp int64) (gnoland.TxWithMetadata, error) {
	callerAddr, err := cryptoGno.AddressFromString(caller)
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}
	cRealm, err := genCommunityRealmSource(administratorsRealmIDs, membersRealmIDs, eventsRealmIDs, caller, chain.namespace, &zenaov1.CreateCommunityRequest{
		DisplayName: cmtReq.DisplayName,
		Description: cmtReq.Description,
		AvatarUri:   cmtReq.AvatarUri,
		BannerUri:   cmtReq.BannerUri,
	})
	if err != nil {
		return gnoland.TxWithMetadata{}, err
	}

	tx := std.Tx{
		Msgs: []std.Msg{
			vm.MsgAddPackage{
				Creator: callerAddr,
				Send:    []std.Coin{},
				Package: &tm2std.MemPackage{
					Name: "community",
					Path: cmtRealmID,
					Files: []*tm2std.MemFile{
						{Name: "community.gno", Body: cRealm},
						{Name: "gnomod.toml", Body: fmt.Sprintf("module = %q\ngno = \"0.9\"\n", cmtRealmID)},
					},
				},
			},
		},
		Fee: std.Fee{
			GasWanted: 10000000,
			GasFee:    std.NewCoin("ugnot", 1000000),
		},
	}

	return gnoland.TxWithMetadata{
		Tx: tx,
		Metadata: &gnoland.GnoTxMetadata{
			Timestamp: timestamp,
		},
	}, nil
}

func SaveTxsToFile(chain *gnoZenaoChain, adminMnemonic string, chainID string, txs []gnoland.TxWithMetadata, outputFile string) error {
	slices.SortStableFunc(txs, func(a, b gnoland.TxWithMetadata) int {
		if a.Metadata == nil || b.Metadata == nil {
			return 0 // If metadata is nil, we can't compare timestamps
		}
		if a.Metadata.Timestamp < b.Metadata.Timestamp {
			return -1
		} else if a.Metadata.Timestamp > b.Metadata.Timestamp {
			return 1
		}
		return 0
	})

	privKey, err := privKeyFromMnemonic(adminMnemonic, chainID)
	if err != nil {
		return err
	}
	if err := gnoland.SignGenesisTxs(txs, privKey, chainID); err != nil {
		return err
	}
	file, err := os.Create(outputFile)
	if err != nil {
		return err
	}
	defer file.Close()
	for _, tx := range txs {
		encodedTx, err := amino.MarshalJSON(tx)
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(file, "%s\n", encodedTx)
		if err != nil {
			return err
		}
	}

	return nil
}

func privKeyFromMnemonic(mnemonic string, chainID string) (cryptoGno.PrivKey, error) {
	signer, err := gnoclient.SignerFromBip39(mnemonic, chainID, "", 0, 0)
	if err != nil {
		return nil, err
	}
	signerFromKeybase, ok := signer.(*gnoclient.SignerFromKeybase)
	if !ok {
		return nil, errors.New("signer is not a SignerFromKeybase")
	}
	signerInfo, err := signer.Info()
	if err != nil {
		return nil, err
	}
	privKey, err := signerFromKeybase.Keybase.ExportPrivKey(signerInfo.GetName(), "")
	if err != nil {
		return nil, err
	}
	return privKey, nil
}
