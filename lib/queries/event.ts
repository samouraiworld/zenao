import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { z } from "zod";

const createEventFormSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageUri: z.string().trim().min(1),
  startDate: z.string(),
  endDate: z.string(),
  ticketPrice: z.coerce.number(),
  capacity: z.coerce.number(),
});

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider("http://127.0.0.1:26657");
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${id}`,
        `getInfoJSON()`,
      );
      const event = extractGnoJSONResponse(res);
      try {
        return createEventFormSchema.parse(event);
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
