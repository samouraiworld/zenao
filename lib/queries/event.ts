import { fromJson } from "@bufbuild/protobuf";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { GetToken } from "../utils";
import { zenaoClient } from "@/lib/zenao-client";
import { extractGnoJSONResponse } from "@/lib/gno";
import { EventInfoJson, EventInfoSchema } from "@/app/gen/zenao/v1/zenao_pb";

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${id}`,
        `event.GetInfoJSON()`,
      );
      const event = extractGnoJSONResponse(res) as EventInfoJson;
      return fromJson(EventInfoSchema, event);
    },
  });

export const eventGatekeepersEmails = (eventId: string, getToken: GetToken) =>
  queryOptions({
    queryKey: ["event", eventId, "getkeepers"],
    queryFn: async () => {
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
  });

export function eventIdFromPkgPath(pkgPath: string): string {
  const res = /(e[\w]+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
