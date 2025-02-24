import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { extractGnoJSONResponse } from "../gno";
import { zenaoClient } from "@/app/zenao-client";

const userRolesEnum = z.enum(["organizer", "participant", "gatekeeper"]);
export const eventGetUserRolesSchema = z.array(userRolesEnum);

export const eventUserRoles = (authToken: string | null, id: string) =>
  queryOptions({
    queryKey: ["eventUserRoles", authToken, id],
    queryFn: async () => {
      if (!authToken) {
        return [];
      }
      if (!process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return [];
      }
      const { address } = await zenaoClient.getUserAddress(
        {},
        { headers: { Authorization: "Bearer " + authToken } },
      );
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT,
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${id}`,
        `event.GetUserRolesJSON(${JSON.stringify(address)})`,
      );
      const event = extractGnoJSONResponse(res);
      return eventGetUserRolesSchema.parse(event);
    },
  });
