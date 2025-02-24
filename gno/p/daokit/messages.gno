package daokit

import (
	"errors"

	"gno.land/p/demo/ufmt"
	"gno.land/p/moul/md"
)

type ExecutableMessage interface {
	String() string
	Type() string
}

type MessageHandler interface {
	Execute(message ExecutableMessage)
	Type() string
}

func NewMessage(kind string, payload interface{}) ExecutableMessage {
	return &genericMessage{kind: kind, payload: payload}
}

type genericMessage struct {
	kind    string
	payload interface{}
}

// String implements ExecutableMessage.
func (g *genericMessage) String() string {
	return ufmt.Sprintf("%v", g.payload)
}

// Type implements ExecutableMessage.
func (g *genericMessage) Type() string {
	return g.kind
}

func NewMessageHandler(kind string, executor func(interface{})) MessageHandler {
	return &genericMessageHandler{kind: kind, executor: executor}
}

type genericMessageHandler struct {
	kind     string
	executor func(payload interface{})
}

// Execute implements MessageHandler.
func (g *genericMessageHandler) Execute(imsg ExecutableMessage) {
	msg, ok := imsg.(*genericMessage)
	if !ok {
		panic(errors.New("invalid message type"))
	}
	g.executor(msg.payload)
}

// Instantiate implements MessageHandler.
func (g *genericMessageHandler) Instantiate() ExecutableMessage {
	return &genericMessage{
		kind: g.kind,
	}
}

// Type implements MessageHandler.
func (g *genericMessageHandler) Type() string {
	return g.kind
}

const MsgExecuteLambdaKind = "gno.land/p/zenao/daokit.ExecuteLambda"

func NewExecuteLambdaHandler() MessageHandler {
	return NewMessageHandler(MsgExecuteLambdaKind, func(i interface{}) {
		cb, ok := i.(func())
		if !ok {
			panic(errors.New("invalid msg type"))
		}
		cb()
	})
}

func NewExecuteLambdaMsg(cb func()) ExecutableMessage {
	return NewMessage(MsgExecuteLambdaKind, cb)
}

const MsgInstantExecuteKind = "gno.land/p/zenao/daokit.InstantExecute"

type msgInstantExecute struct {
	dao DAO
	req ProposalRequest
}

func (m *msgInstantExecute) String() string {
	// XXX: find a way to be explicit about the subdao
	s := ""
	s += md.Paragraph(md.Blockquote(m.req.Message.Type()))
	s += md.Paragraph(m.req.Message.String())
	return s
}

func NewInstantExecuteHandler() MessageHandler {
	return NewMessageHandler(MsgInstantExecuteKind, func(i interface{}) {
		msg, ok := i.(*msgInstantExecute)
		if !ok {
			panic(errors.New("invalid msg type"))
		}
		InstantExecute(msg.dao, msg.req)
	})
}

func NewInstantExecuteMsg(dao DAO, req ProposalRequest) ExecutableMessage {
	return NewMessage(MsgInstantExecuteKind, &msgInstantExecute{dao: dao, req: req})
}
