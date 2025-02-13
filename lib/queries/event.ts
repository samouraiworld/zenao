import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { create, MessageInitShape } from "@bufbuild/protobuf";
import { extractGnoJSONResponse } from "@/lib/gno";
import { EventInfoSchema } from "@/app/gen/zenao/v1/zenao_pb";

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${id}`,
        `Event.GetInfoJSON()`,
      );
      const event = extractGnoJSONResponse(res) as MessageInitShape<
        typeof EventInfoSchema
      >;
      return create(EventInfoSchema, event);
    },
  });
