import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider("http://127.0.0.1:26657");
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events`,
        `Render("")`,
      );
      return res;
    },
  });
