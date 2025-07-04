// Code generated by protoc-gen-connect-go. DO NOT EDIT.
//
// Source: zenao/v1/zenao.proto

package zenaov1connect

import (
	connect "connectrpc.com/connect"
	context "context"
	errors "errors"
	v1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	http "net/http"
	strings "strings"
)

// This is a compile-time assertion to ensure that this generated file and the connect package are
// compatible. If you get a compiler error that this constant is not defined, this code was
// generated with a version of connect newer than the one compiled into your binary. You can fix the
// problem by either regenerating this code with an older version of connect or updating the connect
// version compiled into your binary.
const _ = connect.IsAtLeastVersion1_13_0

const (
	// ZenaoServiceName is the fully-qualified name of the ZenaoService service.
	ZenaoServiceName = "zenao.v1.ZenaoService"
)

// These constants are the fully-qualified names of the RPCs defined in this package. They're
// exposed at runtime as Spec.Procedure and as the final two segments of the HTTP route.
//
// Note that these are different from the fully-qualified method names used by
// google.golang.org/protobuf/reflect/protoreflect. To convert from these constants to
// reflection-formatted method names, remove the leading slash and convert the remaining slash to a
// period.
const (
	// ZenaoServiceEditUserProcedure is the fully-qualified name of the ZenaoService's EditUser RPC.
	ZenaoServiceEditUserProcedure = "/zenao.v1.ZenaoService/EditUser"
	// ZenaoServiceGetUserAddressProcedure is the fully-qualified name of the ZenaoService's
	// GetUserAddress RPC.
	ZenaoServiceGetUserAddressProcedure = "/zenao.v1.ZenaoService/GetUserAddress"
	// ZenaoServiceCreateEventProcedure is the fully-qualified name of the ZenaoService's CreateEvent
	// RPC.
	ZenaoServiceCreateEventProcedure = "/zenao.v1.ZenaoService/CreateEvent"
	// ZenaoServiceEditEventProcedure is the fully-qualified name of the ZenaoService's EditEvent RPC.
	ZenaoServiceEditEventProcedure = "/zenao.v1.ZenaoService/EditEvent"
	// ZenaoServiceGetEventGatekeepersProcedure is the fully-qualified name of the ZenaoService's
	// GetEventGatekeepers RPC.
	ZenaoServiceGetEventGatekeepersProcedure = "/zenao.v1.ZenaoService/GetEventGatekeepers"
	// ZenaoServiceValidatePasswordProcedure is the fully-qualified name of the ZenaoService's
	// ValidatePassword RPC.
	ZenaoServiceValidatePasswordProcedure = "/zenao.v1.ZenaoService/ValidatePassword"
	// ZenaoServiceBroadcastEventProcedure is the fully-qualified name of the ZenaoService's
	// BroadcastEvent RPC.
	ZenaoServiceBroadcastEventProcedure = "/zenao.v1.ZenaoService/BroadcastEvent"
	// ZenaoServiceParticipateProcedure is the fully-qualified name of the ZenaoService's Participate
	// RPC.
	ZenaoServiceParticipateProcedure = "/zenao.v1.ZenaoService/Participate"
	// ZenaoServiceCancelParticipationProcedure is the fully-qualified name of the ZenaoService's
	// CancelParticipation RPC.
	ZenaoServiceCancelParticipationProcedure = "/zenao.v1.ZenaoService/CancelParticipation"
	// ZenaoServiceGetEventTicketsProcedure is the fully-qualified name of the ZenaoService's
	// GetEventTickets RPC.
	ZenaoServiceGetEventTicketsProcedure = "/zenao.v1.ZenaoService/GetEventTickets"
	// ZenaoServiceCheckinProcedure is the fully-qualified name of the ZenaoService's Checkin RPC.
	ZenaoServiceCheckinProcedure = "/zenao.v1.ZenaoService/Checkin"
	// ZenaoServiceExportParticipantsProcedure is the fully-qualified name of the ZenaoService's
	// ExportParticipants RPC.
	ZenaoServiceExportParticipantsProcedure = "/zenao.v1.ZenaoService/ExportParticipants"
	// ZenaoServiceCreatePollProcedure is the fully-qualified name of the ZenaoService's CreatePoll RPC.
	ZenaoServiceCreatePollProcedure = "/zenao.v1.ZenaoService/CreatePoll"
	// ZenaoServiceVotePollProcedure is the fully-qualified name of the ZenaoService's VotePoll RPC.
	ZenaoServiceVotePollProcedure = "/zenao.v1.ZenaoService/VotePoll"
	// ZenaoServiceCreatePostProcedure is the fully-qualified name of the ZenaoService's CreatePost RPC.
	ZenaoServiceCreatePostProcedure = "/zenao.v1.ZenaoService/CreatePost"
	// ZenaoServiceDeletePostProcedure is the fully-qualified name of the ZenaoService's DeletePost RPC.
	ZenaoServiceDeletePostProcedure = "/zenao.v1.ZenaoService/DeletePost"
	// ZenaoServiceReactPostProcedure is the fully-qualified name of the ZenaoService's ReactPost RPC.
	ZenaoServiceReactPostProcedure = "/zenao.v1.ZenaoService/ReactPost"
	// ZenaoServiceEditPostProcedure is the fully-qualified name of the ZenaoService's EditPost RPC.
	ZenaoServiceEditPostProcedure = "/zenao.v1.ZenaoService/EditPost"
	// ZenaoServiceHealthProcedure is the fully-qualified name of the ZenaoService's Health RPC.
	ZenaoServiceHealthProcedure = "/zenao.v1.ZenaoService/Health"
)

// ZenaoServiceClient is a client for the zenao.v1.ZenaoService service.
type ZenaoServiceClient interface {
	// USER
	EditUser(context.Context, *connect.Request[v1.EditUserRequest]) (*connect.Response[v1.EditUserResponse], error)
	GetUserAddress(context.Context, *connect.Request[v1.GetUserAddressRequest]) (*connect.Response[v1.GetUserAddressResponse], error)
	// EVENT
	CreateEvent(context.Context, *connect.Request[v1.CreateEventRequest]) (*connect.Response[v1.CreateEventResponse], error)
	EditEvent(context.Context, *connect.Request[v1.EditEventRequest]) (*connect.Response[v1.EditEventResponse], error)
	GetEventGatekeepers(context.Context, *connect.Request[v1.GetEventGatekeepersRequest]) (*connect.Response[v1.GetEventGatekeepersResponse], error)
	ValidatePassword(context.Context, *connect.Request[v1.ValidatePasswordRequest]) (*connect.Response[v1.ValidatePasswordResponse], error)
	BroadcastEvent(context.Context, *connect.Request[v1.BroadcastEventRequest]) (*connect.Response[v1.BroadcastEventResponse], error)
	Participate(context.Context, *connect.Request[v1.ParticipateRequest]) (*connect.Response[v1.ParticipateResponse], error)
	CancelParticipation(context.Context, *connect.Request[v1.CancelParticipationRequest]) (*connect.Response[v1.CancelParticipationResponse], error)
	GetEventTickets(context.Context, *connect.Request[v1.GetEventTicketsRequest]) (*connect.Response[v1.GetEventTicketsResponse], error)
	Checkin(context.Context, *connect.Request[v1.CheckinRequest]) (*connect.Response[v1.CheckinResponse], error)
	ExportParticipants(context.Context, *connect.Request[v1.ExportParticipantsRequest]) (*connect.Response[v1.ExportParticipantsResponse], error)
	// FEED
	CreatePoll(context.Context, *connect.Request[v1.CreatePollRequest]) (*connect.Response[v1.CreatePollResponse], error)
	VotePoll(context.Context, *connect.Request[v1.VotePollRequest]) (*connect.Response[v1.VotePollResponse], error)
	CreatePost(context.Context, *connect.Request[v1.CreatePostRequest]) (*connect.Response[v1.CreatePostResponse], error)
	DeletePost(context.Context, *connect.Request[v1.DeletePostRequest]) (*connect.Response[v1.DeletePostResponse], error)
	ReactPost(context.Context, *connect.Request[v1.ReactPostRequest]) (*connect.Response[v1.ReactPostResponse], error)
	EditPost(context.Context, *connect.Request[v1.EditPostRequest]) (*connect.Response[v1.EditPostResponse], error)
	// HEALTH
	Health(context.Context, *connect.Request[v1.HealthRequest]) (*connect.Response[v1.HealthResponse], error)
}

// NewZenaoServiceClient constructs a client for the zenao.v1.ZenaoService service. By default, it
// uses the Connect protocol with the binary Protobuf Codec, asks for gzipped responses, and sends
// uncompressed requests. To use the gRPC or gRPC-Web protocols, supply the connect.WithGRPC() or
// connect.WithGRPCWeb() options.
//
// The URL supplied here should be the base URL for the Connect or gRPC server (for example,
// http://api.acme.com or https://acme.com/grpc).
func NewZenaoServiceClient(httpClient connect.HTTPClient, baseURL string, opts ...connect.ClientOption) ZenaoServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	zenaoServiceMethods := v1.File_zenao_v1_zenao_proto.Services().ByName("ZenaoService").Methods()
	return &zenaoServiceClient{
		editUser: connect.NewClient[v1.EditUserRequest, v1.EditUserResponse](
			httpClient,
			baseURL+ZenaoServiceEditUserProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("EditUser")),
			connect.WithClientOptions(opts...),
		),
		getUserAddress: connect.NewClient[v1.GetUserAddressRequest, v1.GetUserAddressResponse](
			httpClient,
			baseURL+ZenaoServiceGetUserAddressProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("GetUserAddress")),
			connect.WithClientOptions(opts...),
		),
		createEvent: connect.NewClient[v1.CreateEventRequest, v1.CreateEventResponse](
			httpClient,
			baseURL+ZenaoServiceCreateEventProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("CreateEvent")),
			connect.WithClientOptions(opts...),
		),
		editEvent: connect.NewClient[v1.EditEventRequest, v1.EditEventResponse](
			httpClient,
			baseURL+ZenaoServiceEditEventProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("EditEvent")),
			connect.WithClientOptions(opts...),
		),
		getEventGatekeepers: connect.NewClient[v1.GetEventGatekeepersRequest, v1.GetEventGatekeepersResponse](
			httpClient,
			baseURL+ZenaoServiceGetEventGatekeepersProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("GetEventGatekeepers")),
			connect.WithClientOptions(opts...),
		),
		validatePassword: connect.NewClient[v1.ValidatePasswordRequest, v1.ValidatePasswordResponse](
			httpClient,
			baseURL+ZenaoServiceValidatePasswordProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("ValidatePassword")),
			connect.WithClientOptions(opts...),
		),
		broadcastEvent: connect.NewClient[v1.BroadcastEventRequest, v1.BroadcastEventResponse](
			httpClient,
			baseURL+ZenaoServiceBroadcastEventProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("BroadcastEvent")),
			connect.WithClientOptions(opts...),
		),
		participate: connect.NewClient[v1.ParticipateRequest, v1.ParticipateResponse](
			httpClient,
			baseURL+ZenaoServiceParticipateProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("Participate")),
			connect.WithClientOptions(opts...),
		),
		cancelParticipation: connect.NewClient[v1.CancelParticipationRequest, v1.CancelParticipationResponse](
			httpClient,
			baseURL+ZenaoServiceCancelParticipationProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("CancelParticipation")),
			connect.WithClientOptions(opts...),
		),
		getEventTickets: connect.NewClient[v1.GetEventTicketsRequest, v1.GetEventTicketsResponse](
			httpClient,
			baseURL+ZenaoServiceGetEventTicketsProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("GetEventTickets")),
			connect.WithClientOptions(opts...),
		),
		checkin: connect.NewClient[v1.CheckinRequest, v1.CheckinResponse](
			httpClient,
			baseURL+ZenaoServiceCheckinProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("Checkin")),
			connect.WithClientOptions(opts...),
		),
		exportParticipants: connect.NewClient[v1.ExportParticipantsRequest, v1.ExportParticipantsResponse](
			httpClient,
			baseURL+ZenaoServiceExportParticipantsProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("ExportParticipants")),
			connect.WithClientOptions(opts...),
		),
		createPoll: connect.NewClient[v1.CreatePollRequest, v1.CreatePollResponse](
			httpClient,
			baseURL+ZenaoServiceCreatePollProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("CreatePoll")),
			connect.WithClientOptions(opts...),
		),
		votePoll: connect.NewClient[v1.VotePollRequest, v1.VotePollResponse](
			httpClient,
			baseURL+ZenaoServiceVotePollProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("VotePoll")),
			connect.WithClientOptions(opts...),
		),
		createPost: connect.NewClient[v1.CreatePostRequest, v1.CreatePostResponse](
			httpClient,
			baseURL+ZenaoServiceCreatePostProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("CreatePost")),
			connect.WithClientOptions(opts...),
		),
		deletePost: connect.NewClient[v1.DeletePostRequest, v1.DeletePostResponse](
			httpClient,
			baseURL+ZenaoServiceDeletePostProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("DeletePost")),
			connect.WithClientOptions(opts...),
		),
		reactPost: connect.NewClient[v1.ReactPostRequest, v1.ReactPostResponse](
			httpClient,
			baseURL+ZenaoServiceReactPostProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("ReactPost")),
			connect.WithClientOptions(opts...),
		),
		editPost: connect.NewClient[v1.EditPostRequest, v1.EditPostResponse](
			httpClient,
			baseURL+ZenaoServiceEditPostProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("EditPost")),
			connect.WithClientOptions(opts...),
		),
		health: connect.NewClient[v1.HealthRequest, v1.HealthResponse](
			httpClient,
			baseURL+ZenaoServiceHealthProcedure,
			connect.WithSchema(zenaoServiceMethods.ByName("Health")),
			connect.WithClientOptions(opts...),
		),
	}
}

// zenaoServiceClient implements ZenaoServiceClient.
type zenaoServiceClient struct {
	editUser            *connect.Client[v1.EditUserRequest, v1.EditUserResponse]
	getUserAddress      *connect.Client[v1.GetUserAddressRequest, v1.GetUserAddressResponse]
	createEvent         *connect.Client[v1.CreateEventRequest, v1.CreateEventResponse]
	editEvent           *connect.Client[v1.EditEventRequest, v1.EditEventResponse]
	getEventGatekeepers *connect.Client[v1.GetEventGatekeepersRequest, v1.GetEventGatekeepersResponse]
	validatePassword    *connect.Client[v1.ValidatePasswordRequest, v1.ValidatePasswordResponse]
	broadcastEvent      *connect.Client[v1.BroadcastEventRequest, v1.BroadcastEventResponse]
	participate         *connect.Client[v1.ParticipateRequest, v1.ParticipateResponse]
	cancelParticipation *connect.Client[v1.CancelParticipationRequest, v1.CancelParticipationResponse]
	getEventTickets     *connect.Client[v1.GetEventTicketsRequest, v1.GetEventTicketsResponse]
	checkin             *connect.Client[v1.CheckinRequest, v1.CheckinResponse]
	exportParticipants  *connect.Client[v1.ExportParticipantsRequest, v1.ExportParticipantsResponse]
	createPoll          *connect.Client[v1.CreatePollRequest, v1.CreatePollResponse]
	votePoll            *connect.Client[v1.VotePollRequest, v1.VotePollResponse]
	createPost          *connect.Client[v1.CreatePostRequest, v1.CreatePostResponse]
	deletePost          *connect.Client[v1.DeletePostRequest, v1.DeletePostResponse]
	reactPost           *connect.Client[v1.ReactPostRequest, v1.ReactPostResponse]
	editPost            *connect.Client[v1.EditPostRequest, v1.EditPostResponse]
	health              *connect.Client[v1.HealthRequest, v1.HealthResponse]
}

// EditUser calls zenao.v1.ZenaoService.EditUser.
func (c *zenaoServiceClient) EditUser(ctx context.Context, req *connect.Request[v1.EditUserRequest]) (*connect.Response[v1.EditUserResponse], error) {
	return c.editUser.CallUnary(ctx, req)
}

// GetUserAddress calls zenao.v1.ZenaoService.GetUserAddress.
func (c *zenaoServiceClient) GetUserAddress(ctx context.Context, req *connect.Request[v1.GetUserAddressRequest]) (*connect.Response[v1.GetUserAddressResponse], error) {
	return c.getUserAddress.CallUnary(ctx, req)
}

// CreateEvent calls zenao.v1.ZenaoService.CreateEvent.
func (c *zenaoServiceClient) CreateEvent(ctx context.Context, req *connect.Request[v1.CreateEventRequest]) (*connect.Response[v1.CreateEventResponse], error) {
	return c.createEvent.CallUnary(ctx, req)
}

// EditEvent calls zenao.v1.ZenaoService.EditEvent.
func (c *zenaoServiceClient) EditEvent(ctx context.Context, req *connect.Request[v1.EditEventRequest]) (*connect.Response[v1.EditEventResponse], error) {
	return c.editEvent.CallUnary(ctx, req)
}

// GetEventGatekeepers calls zenao.v1.ZenaoService.GetEventGatekeepers.
func (c *zenaoServiceClient) GetEventGatekeepers(ctx context.Context, req *connect.Request[v1.GetEventGatekeepersRequest]) (*connect.Response[v1.GetEventGatekeepersResponse], error) {
	return c.getEventGatekeepers.CallUnary(ctx, req)
}

// ValidatePassword calls zenao.v1.ZenaoService.ValidatePassword.
func (c *zenaoServiceClient) ValidatePassword(ctx context.Context, req *connect.Request[v1.ValidatePasswordRequest]) (*connect.Response[v1.ValidatePasswordResponse], error) {
	return c.validatePassword.CallUnary(ctx, req)
}

// BroadcastEvent calls zenao.v1.ZenaoService.BroadcastEvent.
func (c *zenaoServiceClient) BroadcastEvent(ctx context.Context, req *connect.Request[v1.BroadcastEventRequest]) (*connect.Response[v1.BroadcastEventResponse], error) {
	return c.broadcastEvent.CallUnary(ctx, req)
}

// Participate calls zenao.v1.ZenaoService.Participate.
func (c *zenaoServiceClient) Participate(ctx context.Context, req *connect.Request[v1.ParticipateRequest]) (*connect.Response[v1.ParticipateResponse], error) {
	return c.participate.CallUnary(ctx, req)
}

// CancelParticipation calls zenao.v1.ZenaoService.CancelParticipation.
func (c *zenaoServiceClient) CancelParticipation(ctx context.Context, req *connect.Request[v1.CancelParticipationRequest]) (*connect.Response[v1.CancelParticipationResponse], error) {
	return c.cancelParticipation.CallUnary(ctx, req)
}

// GetEventTickets calls zenao.v1.ZenaoService.GetEventTickets.
func (c *zenaoServiceClient) GetEventTickets(ctx context.Context, req *connect.Request[v1.GetEventTicketsRequest]) (*connect.Response[v1.GetEventTicketsResponse], error) {
	return c.getEventTickets.CallUnary(ctx, req)
}

// Checkin calls zenao.v1.ZenaoService.Checkin.
func (c *zenaoServiceClient) Checkin(ctx context.Context, req *connect.Request[v1.CheckinRequest]) (*connect.Response[v1.CheckinResponse], error) {
	return c.checkin.CallUnary(ctx, req)
}

// ExportParticipants calls zenao.v1.ZenaoService.ExportParticipants.
func (c *zenaoServiceClient) ExportParticipants(ctx context.Context, req *connect.Request[v1.ExportParticipantsRequest]) (*connect.Response[v1.ExportParticipantsResponse], error) {
	return c.exportParticipants.CallUnary(ctx, req)
}

// CreatePoll calls zenao.v1.ZenaoService.CreatePoll.
func (c *zenaoServiceClient) CreatePoll(ctx context.Context, req *connect.Request[v1.CreatePollRequest]) (*connect.Response[v1.CreatePollResponse], error) {
	return c.createPoll.CallUnary(ctx, req)
}

// VotePoll calls zenao.v1.ZenaoService.VotePoll.
func (c *zenaoServiceClient) VotePoll(ctx context.Context, req *connect.Request[v1.VotePollRequest]) (*connect.Response[v1.VotePollResponse], error) {
	return c.votePoll.CallUnary(ctx, req)
}

// CreatePost calls zenao.v1.ZenaoService.CreatePost.
func (c *zenaoServiceClient) CreatePost(ctx context.Context, req *connect.Request[v1.CreatePostRequest]) (*connect.Response[v1.CreatePostResponse], error) {
	return c.createPost.CallUnary(ctx, req)
}

// DeletePost calls zenao.v1.ZenaoService.DeletePost.
func (c *zenaoServiceClient) DeletePost(ctx context.Context, req *connect.Request[v1.DeletePostRequest]) (*connect.Response[v1.DeletePostResponse], error) {
	return c.deletePost.CallUnary(ctx, req)
}

// ReactPost calls zenao.v1.ZenaoService.ReactPost.
func (c *zenaoServiceClient) ReactPost(ctx context.Context, req *connect.Request[v1.ReactPostRequest]) (*connect.Response[v1.ReactPostResponse], error) {
	return c.reactPost.CallUnary(ctx, req)
}

// EditPost calls zenao.v1.ZenaoService.EditPost.
func (c *zenaoServiceClient) EditPost(ctx context.Context, req *connect.Request[v1.EditPostRequest]) (*connect.Response[v1.EditPostResponse], error) {
	return c.editPost.CallUnary(ctx, req)
}

// Health calls zenao.v1.ZenaoService.Health.
func (c *zenaoServiceClient) Health(ctx context.Context, req *connect.Request[v1.HealthRequest]) (*connect.Response[v1.HealthResponse], error) {
	return c.health.CallUnary(ctx, req)
}

// ZenaoServiceHandler is an implementation of the zenao.v1.ZenaoService service.
type ZenaoServiceHandler interface {
	// USER
	EditUser(context.Context, *connect.Request[v1.EditUserRequest]) (*connect.Response[v1.EditUserResponse], error)
	GetUserAddress(context.Context, *connect.Request[v1.GetUserAddressRequest]) (*connect.Response[v1.GetUserAddressResponse], error)
	// EVENT
	CreateEvent(context.Context, *connect.Request[v1.CreateEventRequest]) (*connect.Response[v1.CreateEventResponse], error)
	EditEvent(context.Context, *connect.Request[v1.EditEventRequest]) (*connect.Response[v1.EditEventResponse], error)
	GetEventGatekeepers(context.Context, *connect.Request[v1.GetEventGatekeepersRequest]) (*connect.Response[v1.GetEventGatekeepersResponse], error)
	ValidatePassword(context.Context, *connect.Request[v1.ValidatePasswordRequest]) (*connect.Response[v1.ValidatePasswordResponse], error)
	BroadcastEvent(context.Context, *connect.Request[v1.BroadcastEventRequest]) (*connect.Response[v1.BroadcastEventResponse], error)
	Participate(context.Context, *connect.Request[v1.ParticipateRequest]) (*connect.Response[v1.ParticipateResponse], error)
	CancelParticipation(context.Context, *connect.Request[v1.CancelParticipationRequest]) (*connect.Response[v1.CancelParticipationResponse], error)
	GetEventTickets(context.Context, *connect.Request[v1.GetEventTicketsRequest]) (*connect.Response[v1.GetEventTicketsResponse], error)
	Checkin(context.Context, *connect.Request[v1.CheckinRequest]) (*connect.Response[v1.CheckinResponse], error)
	ExportParticipants(context.Context, *connect.Request[v1.ExportParticipantsRequest]) (*connect.Response[v1.ExportParticipantsResponse], error)
	// FEED
	CreatePoll(context.Context, *connect.Request[v1.CreatePollRequest]) (*connect.Response[v1.CreatePollResponse], error)
	VotePoll(context.Context, *connect.Request[v1.VotePollRequest]) (*connect.Response[v1.VotePollResponse], error)
	CreatePost(context.Context, *connect.Request[v1.CreatePostRequest]) (*connect.Response[v1.CreatePostResponse], error)
	DeletePost(context.Context, *connect.Request[v1.DeletePostRequest]) (*connect.Response[v1.DeletePostResponse], error)
	ReactPost(context.Context, *connect.Request[v1.ReactPostRequest]) (*connect.Response[v1.ReactPostResponse], error)
	EditPost(context.Context, *connect.Request[v1.EditPostRequest]) (*connect.Response[v1.EditPostResponse], error)
	// HEALTH
	Health(context.Context, *connect.Request[v1.HealthRequest]) (*connect.Response[v1.HealthResponse], error)
}

// NewZenaoServiceHandler builds an HTTP handler from the service implementation. It returns the
// path on which to mount the handler and the handler itself.
//
// By default, handlers support the Connect, gRPC, and gRPC-Web protocols with the binary Protobuf
// and JSON codecs. They also support gzip compression.
func NewZenaoServiceHandler(svc ZenaoServiceHandler, opts ...connect.HandlerOption) (string, http.Handler) {
	zenaoServiceMethods := v1.File_zenao_v1_zenao_proto.Services().ByName("ZenaoService").Methods()
	zenaoServiceEditUserHandler := connect.NewUnaryHandler(
		ZenaoServiceEditUserProcedure,
		svc.EditUser,
		connect.WithSchema(zenaoServiceMethods.ByName("EditUser")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceGetUserAddressHandler := connect.NewUnaryHandler(
		ZenaoServiceGetUserAddressProcedure,
		svc.GetUserAddress,
		connect.WithSchema(zenaoServiceMethods.ByName("GetUserAddress")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceCreateEventHandler := connect.NewUnaryHandler(
		ZenaoServiceCreateEventProcedure,
		svc.CreateEvent,
		connect.WithSchema(zenaoServiceMethods.ByName("CreateEvent")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceEditEventHandler := connect.NewUnaryHandler(
		ZenaoServiceEditEventProcedure,
		svc.EditEvent,
		connect.WithSchema(zenaoServiceMethods.ByName("EditEvent")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceGetEventGatekeepersHandler := connect.NewUnaryHandler(
		ZenaoServiceGetEventGatekeepersProcedure,
		svc.GetEventGatekeepers,
		connect.WithSchema(zenaoServiceMethods.ByName("GetEventGatekeepers")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceValidatePasswordHandler := connect.NewUnaryHandler(
		ZenaoServiceValidatePasswordProcedure,
		svc.ValidatePassword,
		connect.WithSchema(zenaoServiceMethods.ByName("ValidatePassword")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceBroadcastEventHandler := connect.NewUnaryHandler(
		ZenaoServiceBroadcastEventProcedure,
		svc.BroadcastEvent,
		connect.WithSchema(zenaoServiceMethods.ByName("BroadcastEvent")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceParticipateHandler := connect.NewUnaryHandler(
		ZenaoServiceParticipateProcedure,
		svc.Participate,
		connect.WithSchema(zenaoServiceMethods.ByName("Participate")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceCancelParticipationHandler := connect.NewUnaryHandler(
		ZenaoServiceCancelParticipationProcedure,
		svc.CancelParticipation,
		connect.WithSchema(zenaoServiceMethods.ByName("CancelParticipation")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceGetEventTicketsHandler := connect.NewUnaryHandler(
		ZenaoServiceGetEventTicketsProcedure,
		svc.GetEventTickets,
		connect.WithSchema(zenaoServiceMethods.ByName("GetEventTickets")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceCheckinHandler := connect.NewUnaryHandler(
		ZenaoServiceCheckinProcedure,
		svc.Checkin,
		connect.WithSchema(zenaoServiceMethods.ByName("Checkin")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceExportParticipantsHandler := connect.NewUnaryHandler(
		ZenaoServiceExportParticipantsProcedure,
		svc.ExportParticipants,
		connect.WithSchema(zenaoServiceMethods.ByName("ExportParticipants")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceCreatePollHandler := connect.NewUnaryHandler(
		ZenaoServiceCreatePollProcedure,
		svc.CreatePoll,
		connect.WithSchema(zenaoServiceMethods.ByName("CreatePoll")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceVotePollHandler := connect.NewUnaryHandler(
		ZenaoServiceVotePollProcedure,
		svc.VotePoll,
		connect.WithSchema(zenaoServiceMethods.ByName("VotePoll")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceCreatePostHandler := connect.NewUnaryHandler(
		ZenaoServiceCreatePostProcedure,
		svc.CreatePost,
		connect.WithSchema(zenaoServiceMethods.ByName("CreatePost")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceDeletePostHandler := connect.NewUnaryHandler(
		ZenaoServiceDeletePostProcedure,
		svc.DeletePost,
		connect.WithSchema(zenaoServiceMethods.ByName("DeletePost")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceReactPostHandler := connect.NewUnaryHandler(
		ZenaoServiceReactPostProcedure,
		svc.ReactPost,
		connect.WithSchema(zenaoServiceMethods.ByName("ReactPost")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceEditPostHandler := connect.NewUnaryHandler(
		ZenaoServiceEditPostProcedure,
		svc.EditPost,
		connect.WithSchema(zenaoServiceMethods.ByName("EditPost")),
		connect.WithHandlerOptions(opts...),
	)
	zenaoServiceHealthHandler := connect.NewUnaryHandler(
		ZenaoServiceHealthProcedure,
		svc.Health,
		connect.WithSchema(zenaoServiceMethods.ByName("Health")),
		connect.WithHandlerOptions(opts...),
	)
	return "/zenao.v1.ZenaoService/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case ZenaoServiceEditUserProcedure:
			zenaoServiceEditUserHandler.ServeHTTP(w, r)
		case ZenaoServiceGetUserAddressProcedure:
			zenaoServiceGetUserAddressHandler.ServeHTTP(w, r)
		case ZenaoServiceCreateEventProcedure:
			zenaoServiceCreateEventHandler.ServeHTTP(w, r)
		case ZenaoServiceEditEventProcedure:
			zenaoServiceEditEventHandler.ServeHTTP(w, r)
		case ZenaoServiceGetEventGatekeepersProcedure:
			zenaoServiceGetEventGatekeepersHandler.ServeHTTP(w, r)
		case ZenaoServiceValidatePasswordProcedure:
			zenaoServiceValidatePasswordHandler.ServeHTTP(w, r)
		case ZenaoServiceBroadcastEventProcedure:
			zenaoServiceBroadcastEventHandler.ServeHTTP(w, r)
		case ZenaoServiceParticipateProcedure:
			zenaoServiceParticipateHandler.ServeHTTP(w, r)
		case ZenaoServiceCancelParticipationProcedure:
			zenaoServiceCancelParticipationHandler.ServeHTTP(w, r)
		case ZenaoServiceGetEventTicketsProcedure:
			zenaoServiceGetEventTicketsHandler.ServeHTTP(w, r)
		case ZenaoServiceCheckinProcedure:
			zenaoServiceCheckinHandler.ServeHTTP(w, r)
		case ZenaoServiceExportParticipantsProcedure:
			zenaoServiceExportParticipantsHandler.ServeHTTP(w, r)
		case ZenaoServiceCreatePollProcedure:
			zenaoServiceCreatePollHandler.ServeHTTP(w, r)
		case ZenaoServiceVotePollProcedure:
			zenaoServiceVotePollHandler.ServeHTTP(w, r)
		case ZenaoServiceCreatePostProcedure:
			zenaoServiceCreatePostHandler.ServeHTTP(w, r)
		case ZenaoServiceDeletePostProcedure:
			zenaoServiceDeletePostHandler.ServeHTTP(w, r)
		case ZenaoServiceReactPostProcedure:
			zenaoServiceReactPostHandler.ServeHTTP(w, r)
		case ZenaoServiceEditPostProcedure:
			zenaoServiceEditPostHandler.ServeHTTP(w, r)
		case ZenaoServiceHealthProcedure:
			zenaoServiceHealthHandler.ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})
}

// UnimplementedZenaoServiceHandler returns CodeUnimplemented from all methods.
type UnimplementedZenaoServiceHandler struct{}

func (UnimplementedZenaoServiceHandler) EditUser(context.Context, *connect.Request[v1.EditUserRequest]) (*connect.Response[v1.EditUserResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.EditUser is not implemented"))
}

func (UnimplementedZenaoServiceHandler) GetUserAddress(context.Context, *connect.Request[v1.GetUserAddressRequest]) (*connect.Response[v1.GetUserAddressResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.GetUserAddress is not implemented"))
}

func (UnimplementedZenaoServiceHandler) CreateEvent(context.Context, *connect.Request[v1.CreateEventRequest]) (*connect.Response[v1.CreateEventResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.CreateEvent is not implemented"))
}

func (UnimplementedZenaoServiceHandler) EditEvent(context.Context, *connect.Request[v1.EditEventRequest]) (*connect.Response[v1.EditEventResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.EditEvent is not implemented"))
}

func (UnimplementedZenaoServiceHandler) GetEventGatekeepers(context.Context, *connect.Request[v1.GetEventGatekeepersRequest]) (*connect.Response[v1.GetEventGatekeepersResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.GetEventGatekeepers is not implemented"))
}

func (UnimplementedZenaoServiceHandler) ValidatePassword(context.Context, *connect.Request[v1.ValidatePasswordRequest]) (*connect.Response[v1.ValidatePasswordResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.ValidatePassword is not implemented"))
}

func (UnimplementedZenaoServiceHandler) BroadcastEvent(context.Context, *connect.Request[v1.BroadcastEventRequest]) (*connect.Response[v1.BroadcastEventResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.BroadcastEvent is not implemented"))
}

func (UnimplementedZenaoServiceHandler) Participate(context.Context, *connect.Request[v1.ParticipateRequest]) (*connect.Response[v1.ParticipateResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.Participate is not implemented"))
}

func (UnimplementedZenaoServiceHandler) CancelParticipation(context.Context, *connect.Request[v1.CancelParticipationRequest]) (*connect.Response[v1.CancelParticipationResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.CancelParticipation is not implemented"))
}

func (UnimplementedZenaoServiceHandler) GetEventTickets(context.Context, *connect.Request[v1.GetEventTicketsRequest]) (*connect.Response[v1.GetEventTicketsResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.GetEventTickets is not implemented"))
}

func (UnimplementedZenaoServiceHandler) Checkin(context.Context, *connect.Request[v1.CheckinRequest]) (*connect.Response[v1.CheckinResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.Checkin is not implemented"))
}

func (UnimplementedZenaoServiceHandler) ExportParticipants(context.Context, *connect.Request[v1.ExportParticipantsRequest]) (*connect.Response[v1.ExportParticipantsResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.ExportParticipants is not implemented"))
}

func (UnimplementedZenaoServiceHandler) CreatePoll(context.Context, *connect.Request[v1.CreatePollRequest]) (*connect.Response[v1.CreatePollResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.CreatePoll is not implemented"))
}

func (UnimplementedZenaoServiceHandler) VotePoll(context.Context, *connect.Request[v1.VotePollRequest]) (*connect.Response[v1.VotePollResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.VotePoll is not implemented"))
}

func (UnimplementedZenaoServiceHandler) CreatePost(context.Context, *connect.Request[v1.CreatePostRequest]) (*connect.Response[v1.CreatePostResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.CreatePost is not implemented"))
}

func (UnimplementedZenaoServiceHandler) DeletePost(context.Context, *connect.Request[v1.DeletePostRequest]) (*connect.Response[v1.DeletePostResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.DeletePost is not implemented"))
}

func (UnimplementedZenaoServiceHandler) ReactPost(context.Context, *connect.Request[v1.ReactPostRequest]) (*connect.Response[v1.ReactPostResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.ReactPost is not implemented"))
}

func (UnimplementedZenaoServiceHandler) EditPost(context.Context, *connect.Request[v1.EditPostRequest]) (*connect.Response[v1.EditPostResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.EditPost is not implemented"))
}

func (UnimplementedZenaoServiceHandler) Health(context.Context, *connect.Request[v1.HealthRequest]) (*connect.Response[v1.HealthResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("zenao.v1.ZenaoService.Health is not implemented"))
}
