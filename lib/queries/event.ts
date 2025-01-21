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

export const eventCreatorOptions = (id: string) =>
  queryOptions({
    queryKey: ["eventCreator", id],
    queryFn: async () => {
      try {
        const client = new GnoJSONRPCProvider("http://127.0.0.1:26657");
        const res = await client.getFileContent(
          `gno.land/r/zenao/events/e${id}/event.gno`,
        );
        const array = res.split("\n");
        const regex = new RegExp("creator", "i");
        const creator = array
          .filter((item) => regex.test(item))[0]
          .trim()
          .split('"')[1];

        return creator || null;
      } catch (err) {
        console.error(err);
      }

      return null;
    },
  });

export const eventsOptions = () =>
  queryOptions({
    queryKey: ["events"],
    queryFn: async () => {
      try {
        const client = new GnoJSONRPCProvider("http://127.0.0.1:26657");
        const res = await client.evaluateExpression(
          `gno.land/r/zenao/events`,
          `Render("")`,
        );
        return res;
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
