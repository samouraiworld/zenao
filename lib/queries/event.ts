import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { fromJson } from "@bufbuild/protobuf";
import { withSpan } from "../tracer";
import { GetToken } from "@/lib/utils";
import { extractGnoJSONResponse } from "@/lib/gno";
import { EventInfoJson, EventInfoSchema } from "@/app/gen/zenao/v1/zenao_pb";
import { zenaoClient } from "@/lib/zenao-client";

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      return withSpan(`query:chain:event:${id}`, async () => {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );
        const res = await client.evaluateExpression(
          `gno.land/r/zenao/events/e${id}`,
          `event.GetInfoJSON()`,
        );
        const event = extractGnoJSONResponse(res) as EventInfoJson;
        return fromJson(EventInfoSchema, event);
      });
    },
    staleTime: Infinity,
  });

export const eventGatekeepersEmails = (eventId: string, getToken: GetToken) =>
  queryOptions({
    queryKey: ["event", eventId, "gatekeepers"],
    queryFn: async () => {
      return withSpan(
        `query:backend:event:${eventId}:gatekeepers`,
        async () => {
          const token = await getToken();

          if (!token) {
            throw new Error("not authenticated");
          }

          const data = await zenaoClient.getEventGatekeepers(
            {
              eventId,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );

          return data;
        },
      );
    },
  });

export function eventIdFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
