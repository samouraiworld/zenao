import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { extractGnoJSONResponse } from "../gno";

const userRolesEnum = z.enum(["organizer", "participant", "gatekeeper"]);

export type EventUserRole = z.infer<typeof userRolesEnum>;

export const eventGetUserRolesSchema = z.array(userRolesEnum);

export const eventUserRoles = (
  eventId: string | null | undefined,
  userAddress: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["eventUserRoles", eventId, userAddress],
    queryFn: async () => {
      if (
        !eventId ||
        !userAddress ||
        !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT
      ) {
        return [];
      }
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT,
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${eventId}`,
        `event.GetUserRolesJSON(${JSON.stringify(userAddress)})`,
      );
      const roles = extractGnoJSONResponse(res);
      return eventGetUserRolesSchema.parse(roles);
    },
  });

export const eventUsersWithRole = (
  eventId: string | null | undefined,
  role: EventUserRole | null | undefined,
) =>
  queryOptions({
    queryKey: ["eventUsersWithRole", eventId, role],
    queryFn: async () => {
      if (!eventId || !role || !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return [];
      }
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT,
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${eventId}`,
        `event.GetUsersWithRoleJSON(${JSON.stringify(role)})`,
      );
      const addresses = extractGnoJSONResponse(res);
      return z.string().array().parse(addresses);
    },
  });
