import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { extractGnoJSONResponse } from "../gno";

const eventUserRolesEnum = z.enum(["organizer", "participant", "gatekeeper"]);

export type EventUserRole = z.infer<typeof eventUserRolesEnum>;

export const eventGetUserRolesSchema = z.array(eventUserRolesEnum);

export const eventUserRoles = (
  eventId: string | null | undefined,
  userRealmId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["eventUserRoles", eventId, userRealmId],
    queryFn: async () => {
      if (
        !eventId ||
        !userRealmId ||
        !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT
      ) {
        return [];
      }

      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT,
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/events/e${eventId}`,
        `event.GetUserRolesJSON(${JSON.stringify(userRealmId)})`,
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
