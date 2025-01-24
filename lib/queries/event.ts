import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { z } from "zod";

export const eventInfoSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageUri: z.string().trim().min(1).url(),
  startDate: z.coerce.bigint(),
  endDate: z.coerce.bigint(),
  capacity: z.coerce.number(),
});

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      try {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );
        const res = await client.evaluateExpression(
          `gno.land/r/zenao/events/e${id}`,
          `event.GetInfoJSON()`,
        );
        const event = extractGnoJSONResponse(res);
        return eventInfoSchema.parse(event);
      } catch (err) {
        console.error(err);
      }

      return null;
    },
  });

function extractGnoJSONResponse(res: string): unknown {
  const jsonString = res.substring("(".length, res.length - " string)".length);
  // eslint-disable-next-line no-restricted-syntax
  const jsonStringContent = JSON.parse(jsonString);
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(jsonStringContent) as unknown;
}
