package basedao

import (
	"std"
	"testing"

	"gno.land/p/demo/testutils"
	"gno.land/p/demo/urequire"
	"gno.land/p/zenao/daocond"
	"gno.land/p/zenao/daokit"
	"gno.land/p/zenao/role_manager"
)

var (
	alice = testutils.TestAddress("alice")
	bob   = testutils.TestAddress("bob")
	carol = testutils.TestAddress("carol")
	dave  = testutils.TestAddress("dave")
)

func TestNewDAO(t *testing.T) {
	initialRoles := []role_manager.RoleInfo{
		{Name: "admin", Description: "Admin is the superuser"},
	}
	initialMembers := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
		{carol.String(), []string{}},
	}
	conf := &Config{
		Name:             "My DAO",
		Description:      "My DAO Description",
		Members:          NewMembersStore(initialRoles, initialMembers),
		GetProfileString: func(addr std.Address, field, def string) string { return "" },
		SetProfileString: func(field, value string) bool { return true },
	}

	daoRealm := std.NewCodeRealm("gno.land/r/testing/daorealm")
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(daoRealm)
	_, dao := New(conf)
	roles := dao.Members.GetRoles()
	if len(roles) != 1 {
		t.Errorf("Expected 1 role, got %d", len(roles))
	}
	if roles[0] != "admin" {
		t.Errorf("Expected role 'admin', got %s", roles[0])
	}

	for _, member := range initialMembers {
		address := member.Address
		if !dao.Members.IsMember(address) {
			t.Errorf("Expected member %s to be a member", address)
		}
		if len(member.Roles) == 1 && !dao.Members.HasRole(address, member.Roles[0]) {
			t.Errorf("Expected member %s to have role %s", address, member.Roles[0])
		}
	}

	urequire.Equal(t, 5, dao.Core.ResourcesCount(), "expected 5 resources")
	urequire.Equal(t, dao.Realm.PkgPath(), daoRealm.PkgPath())

	// XXX: check realm and profile
}

func TestPropose(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
		{carol.String(), []string{}},
	}
	tdao := newTestingDAO(t, 0.6, members)

	type testNewProposalInput struct {
		proposalReq daokit.ProposalRequest
		proposer    std.Address
	}

	type tesNewProposalExpected struct {
		title        string
		description  string
		proposer     std.Address
		messsageType string
		panic        bool
	}

	type testNewProposal struct {
		input    testNewProposalInput
		expected tesNewProposalExpected
	}

	type testNewProposalTable map[string]testNewProposal

	tests := testNewProposalTable{
		"Success": {
			input: testNewProposalInput{
				proposalReq: tdao.mockProposalRequest,
				proposer:    alice,
			},
			expected: tesNewProposalExpected{
				title:        "My Proposal",
				description:  "My Proposal Description",
				proposer:     alice,
				messsageType: "valid",
				panic:        false,
			},
		},
		"Non-member": {
			input: testNewProposalInput{
				proposalReq: tdao.mockProposalRequest,
				proposer:    dave,
			},
			expected: tesNewProposalExpected{
				panic: true,
			},
		},
		"Unknown message type": {
			input: testNewProposalInput{
				proposalReq: tdao.unknownProposalRequest,
				proposer:    alice,
			},
			expected: tesNewProposalExpected{
				panic: true,
			},
		},
	}

	for testName, test := range tests {
		t.Run(testName, func(t *testing.T) {
			if test.expected.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("Expected panic, got none")
					}
				}()
			}

			std.TestSetOriginCaller(test.input.proposer)

			*tdao.mockHandlerCalled = false
			id := tdao.dao.Propose(test.input.proposalReq)
			urequire.False(t, *tdao.mockHandlerCalled, "execute should not be called")

			proposal := tdao.privdao.Core.Proposals.GetProposal(id)
			if proposal.Title != test.expected.title {
				t.Errorf("Expected title %s, got %s", test.expected.title, proposal.Title)
			}
			if proposal.Description != test.expected.description {
				t.Errorf("Expected description %s, got %s", test.expected.description, proposal.Description)
			}
			if proposal.ProposerID != test.expected.proposer.String() {
				t.Errorf("Expected proposer %s, got %s", test.expected.proposer, proposal.ProposerID)
			}
			if proposal.Message.Type() != test.expected.messsageType {
				t.Errorf("Expected message type %s, got %s", test.expected.messsageType, proposal.Message.Type())
			}
		})
	}
}

func TestVote(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
		{carol.String(), []string{}},
	}
	tdao := newTestingDAO(t, 0.6, members)

	std.TestSetOriginCaller(alice)
	tdao.dao.Propose(tdao.mockProposalRequest)

	type testVoteInput struct {
		proposalID uint64
		vote       daocond.Vote
		voter      std.Address
	}

	type testVoteExpected struct {
		eval  bool
		panic string
	}

	type testVote struct {
		input    testVoteInput
		expected testVoteExpected
	}

	type testVoteTable map[string]testVote

	tests := testVoteTable{
		"Success no": {
			input: testVoteInput{
				proposalID: 1,
				vote:       "no",
				voter:      alice,
			},
			expected: testVoteExpected{
				eval: false,
			},
		},
		"Success yes": {
			input: testVoteInput{
				proposalID: 1,
				vote:       "yes",
				voter:      alice,
			},
			expected: testVoteExpected{
				eval: true,
			},
		},
		"Unknown proposal": {
			input: testVoteInput{
				proposalID: 2,
				vote:       "yes",
				voter:      alice,
			},
			expected: testVoteExpected{
				panic: "proposal not found",
			},
		},
		"Non-member": {
			input: testVoteInput{
				proposalID: 1,
				vote:       "yes",
				voter:      dave,
			},
			expected: testVoteExpected{
				panic: "caller is not a member",
			},
		},
		"Invalid vote": {
			input: testVoteInput{
				proposalID: 1,
				vote:       "very-long-vote-very-long-vote-very-long-vote",
				voter:      alice,
			},
			expected: testVoteExpected{
				panic: "invalid vote",
			},
		},
	}

	for testName, test := range tests {
		t.Run(testName, func(t *testing.T) {
			run := func() {
				std.TestSetOriginCaller(test.input.voter)
				tdao.dao.Vote(test.input.proposalID, test.input.vote)
			}

			*tdao.mockHandlerCalled = false

			if test.expected.panic != "" {
				urequire.PanicsWithMessage(t, test.expected.panic, run)
			} else {
				urequire.NotPanics(t, run)
				urequire.False(t, *tdao.mockHandlerCalled, "execute should not be called")
				proposal := tdao.privdao.Core.Proposals.GetProposal(test.input.proposalID)
				eval := proposal.ConditionState.Eval(proposal.Votes)
				if eval != test.expected.eval {
					t.Errorf("Expected eval %t, got %t", test.expected.eval, eval)
				}
			}
		})
	}
}

func TestExecuteProposal(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
		{carol.String(), []string{}},
	}
	tdao := newTestingDAO(t, 0.6, members)

	std.TestSetOriginCaller(alice)
	tdao.dao.Propose(tdao.mockProposalRequest)

	type testExecuteInput struct {
		proposalID uint64
		executor   std.Address
		haveVote   bool
		voter      std.Address
	}

	type testExecuteExpected struct {
		panic bool
	}

	type testExecute struct {
		input    testExecuteInput
		expected testExecuteExpected
	}

	type testExecuteTable map[string]testExecute

	tests := testExecuteTable{
		"Conditions not met": {
			input: testExecuteInput{
				proposalID: 1,
				executor:   alice,
				haveVote:   false,
				voter:      alice,
			},
			expected: testExecuteExpected{
				panic: true,
			},
		},
		"Success": {
			input: testExecuteInput{
				proposalID: 1,
				executor:   alice,
				haveVote:   true,
				voter:      alice,
			},
			expected: testExecuteExpected{
				panic: false,
			},
		},
		"Unknown proposal": {
			input: testExecuteInput{
				proposalID: 2,
				executor:   alice,
				haveVote:   false,
				voter:      alice,
			},
			expected: testExecuteExpected{
				panic: true,
			},
		},
		"Non-member": {
			input: testExecuteInput{
				proposalID: 1,
				executor:   dave,
				haveVote:   false,
				voter:      alice,
			},
			expected: testExecuteExpected{
				panic: true,
			},
		},
	}

	for testName, test := range tests {
		t.Run(testName, func(t *testing.T) {
			if test.expected.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("Expected panic, got none")
					}
				}()
			}

			if test.input.haveVote {
				std.TestSetOriginCaller(test.input.voter)
				tdao.dao.Vote(test.input.proposalID, "yes")
			}

			std.TestSetOriginCaller(test.input.executor)
			tdao.dao.Execute(test.input.proposalID)

			proposal := tdao.privdao.Core.Proposals.GetProposal(test.input.proposalID)

			if proposal.Status != daokit.ProposalStatusExecuted {
				t.Errorf("Expected status %s, got %s", daokit.ProposalStatusExecuted, proposal.Status)
			}
		})
	}
}

func TestInstantExecute(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
		{carol.String(), []string{}},
	}
	tdao := newTestingDAO(t, 0.6, members)

	std.TestSetOriginCaller(alice)

	type testInstantExecuteInput struct {
		proposalReq daokit.ProposalRequest
		executor    std.Address
	}

	type testInstantExecuteExpected struct {
		panic bool
	}

	type testInstantExecute struct {
		input    testInstantExecuteInput
		expected testInstantExecuteExpected
	}

	type testInstantExecuteTable map[string]testInstantExecute

	tests := testInstantExecuteTable{
		"Success": {
			input: testInstantExecuteInput{
				proposalReq: tdao.mockProposalRequest,
				executor:    alice,
			},
			expected: testInstantExecuteExpected{
				panic: false,
			},
		},
		"Unknown message type": {
			input: testInstantExecuteInput{
				proposalReq: tdao.unknownProposalRequest,
				executor:    alice,
			},
			expected: testInstantExecuteExpected{
				panic: true,
			},
		},
		"Non-member": {
			input: testInstantExecuteInput{
				proposalReq: tdao.mockProposalRequest,
				executor:    dave,
			},
			expected: testInstantExecuteExpected{
				panic: true,
			},
		},
	}

	for testName, test := range tests {
		t.Run(testName, func(t *testing.T) {
			if test.expected.panic {
				defer func() {
					if r := recover(); r == nil {
						t.Errorf("Expected panic, got none")
					}
				}()
			}

			std.TestSetOriginCaller(test.input.executor)
			daokit.InstantExecute(tdao.dao, test.input.proposalReq)
		})
	}
}

func TestGetMembers(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
		{carol.String(), []string{}},
	}
	tdao := newTestingDAO(t, 0.6, members)

	expectedMembers := []string{alice.String(), bob.String(), carol.String()}
	m := tdao.privdao.Members.GetMembers()
	if len(m) != len(expectedMembers) {
		t.Errorf("Expected %d members, got %d", len(expectedMembers), len(m))
	}

	for _, eMember := range expectedMembers {
		if !tdao.privdao.Members.IsMember(eMember) {
			t.Errorf("Expected member %s to be a member", eMember)
		}
	}
}

func TestAddMemberProposal(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
	}
	tdao := newTestingDAO(t, 0.2, members)

	if tdao.privdao.Members.IsMember(bob.String()) {
		t.Errorf("Expected member %s to not be a member", bob.String())
	}

	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message: NewAddMemberMsg(&MsgAddMember{
			Address: bob,
			Roles:   []string{"admin"},
		}),
	})

	if !tdao.privdao.Members.IsMember(bob.String()) {
		t.Errorf("Expected member %s to be a member", bob.String())
	}

	if !tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected member %s to have role 'admin'", bob.String())
	}

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	proposalWithUnknownRole := daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message: NewAddMemberMsg(&MsgAddMember{
			Address: bob,
			Roles:   []string{"unknown"},
		}),
	}
	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, proposalWithUnknownRole)
}

func TestRemoveMemberProposal(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{"admin"}},
	}
	tdao := newTestingDAO(t, 0.2, members)

	if !tdao.privdao.Members.IsMember(bob.String()) {
		t.Errorf("Expected member %s to be a member", bob.String())
	}

	if !tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected member %s to have role 'admin'", bob.String())
	}

	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewRemoveMemberMsg(bob),
	})

	if tdao.privdao.Members.IsMember(bob.String()) {
		t.Errorf("Expected user %s to not be a member", bob.String())
	}

	if tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected user %s to not have role 'admin'", bob.String())
	}
}

func TestAddRoleToUserProposal(t *testing.T) {
	members := []Member{
		{alice.String(), []string{"admin"}},
		{bob.String(), []string{}},
	}
	tdao := newTestingDAO(t, 0.2, members)

	std.TestSetOriginCaller(alice)

	if tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected member %s to not have role 'admin'", bob.String())
	}

	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewAssignRoleMsg(&MsgAssignRole{Address: bob, Role: "admin"}),
	})

	if !tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected member %s to have role 'admin'", bob.String())
	}

	defer func() {
		// FIXME: this will pass if any other steps panics
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewAssignRoleMsg(&MsgAssignRole{Address: alice, Role: "unknown"}),
	})

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewAssignRoleMsg(&MsgAssignRole{Address: carol, Role: "admin"}),
	})

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewAssignRoleMsg(&MsgAssignRole{Address: bob, Role: "admin"}),
	})
}

func TestRemoveRoleFromUserProposal(t *testing.T) {
	members := []Member{
		{
			alice.String(),
			[]string{"admin"},
		},
		{
			bob.String(),
			[]string{"admin"},
		},
	}
	tdao := newTestingDAO(t, 0.2, members)

	if !tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected member %s to have role 'admin'", bob.String())
	}

	daokit.InstantExecute(tdao.dao, daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewUnassignRoleMsg(&MsgUnassignRole{Address: bob, Role: "admin"}),
	})

	if tdao.privdao.Members.HasRole(bob.String(), "admin") {
		t.Errorf("Expected member %s to not have role 'admin'", bob.String())
	}

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	proposalWithUnknowkRole := daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewUnassignRoleMsg(&MsgUnassignRole{Address: alice, Role: "unknown"}),
	}
	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, proposalWithUnknowkRole)

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	proposalWithNonMember := daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewUnassignRoleMsg(&MsgUnassignRole{Address: carol, Role: "admin"}),
	}
	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, proposalWithNonMember)

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic, got none")
		}
	}()

	proposalWithNonRole := daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     NewUnassignRoleMsg(&MsgUnassignRole{Address: bob, Role: "admin"}),
	}
	std.TestSetOriginCaller(alice)
	daokit.InstantExecute(tdao.dao, proposalWithNonRole)
}

type testingDAOContext struct {
	dao                    daokit.DAO
	privdao                *DAOPrivate
	mockHandlerCalled      *bool
	mockHandler            daokit.MessageHandler
	mockProposalRequest    daokit.ProposalRequest
	unknownProposalRequest daokit.ProposalRequest
}

func newTestingDAO(t *testing.T, threshold float64, members []Member) *testingDAOContext {
	roles := []role_manager.RoleInfo{{Name: "admin", Description: "Admin is the superuser"}}
	membersStore := NewMembersStore(roles, members)
	initialCondition := daocond.MembersThreshold(threshold, membersStore.IsMember, membersStore.MembersCount)

	conf := &Config{
		Name:             "My DAO",
		Description:      "My DAO Description",
		Members:          membersStore,
		InitialCondition: initialCondition,
		SetProfileString: func(field, value string) bool { return true },
		GetProfileString: func(addr std.Address, field, def string) string { return "" },
	}

	daoRealm := std.NewCodeRealm("gno.land/r/testing/daorealm")
	std.TestSetOriginCaller(alice)
	std.TestSetRealm(daoRealm)
	pubdao, dao := New(conf)

	mockHandlerCalled := false
	mockHandler := daokit.NewMessageHandler("valid", func(_ interface{}) { mockHandlerCalled = true })
	dao.Core.Resources.Set(&daokit.Resource{
		Handler:   mockHandler,
		Condition: daocond.MembersThreshold(0.2, dao.Members.IsMember, dao.Members.MembersCount),
	})

	mockProposalRequest := daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     daokit.NewMessage("valid", nil),
	}

	unknownProposalRequest := daokit.ProposalRequest{
		Title:       "My Proposal",
		Description: "My Proposal Description",
		Message:     daokit.NewMessage("unknown", nil),
	}

	return &testingDAOContext{
		dao:                    pubdao,
		privdao:                dao,
		mockHandlerCalled:      &mockHandlerCalled,
		mockHandler:            mockHandler,
		mockProposalRequest:    mockProposalRequest,
		unknownProposalRequest: unknownProposalRequest,
	}
}
