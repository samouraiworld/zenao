import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { eventFormSchema } from "@/components/form/types";

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      try {
        const client = new GnoJSONRPCProvider("http://127.0.0.1:26657");
        const res = await client.evaluateExpression(
          `gno.land/r/zenao/events/e${id}`,
          `getInfoJSON()`,
        );
        const event = extractGnoJSONResponse(res);
        return eventFormSchema.parse(event);
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
