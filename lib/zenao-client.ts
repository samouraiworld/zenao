import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

// Import service definition that you want to connect to.
import { ZenaoService } from "@/app/gen/zenao/v1/zenao_pb";

// The transport defines what type of endpoint we're hitting.
// In our example we'll be communicating with a Connect endpoint.
// If your endpoint only supports gRPC-web, make sure to use
// `createGrpcWebTransport` instead.
const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_ZENAO_BACKEND_ENDPOINT || "",
});

// Here we make the client itself, combining the service
// definition with the transport.
export const zenaoClient = createClient(ZenaoService, transport);
