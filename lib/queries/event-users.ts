import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";

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

      return withSpan(
        `query:backend:event:${eventId}:user-roles:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT!,
          // );
          // const res = await client.evaluateExpression(
          //   `gno.land/r/zenao/events/e${eventId}`,
          //   `event.GetUserRolesJSON(${JSON.stringify(userRealmId)})`,
          // );
          // const roles = extractGnoJSONResponse(res);

          const res = await zenaoClient.entityRoles({
            org: {
              entityType: "event",
              entityId: eventId,
            },
            entity: {
              entityType: "user",
              entityId: userIdFromPkgPath(userRealmId),
            },
          });
          const roles = res.roles;

          return eventGetUserRolesSchema.parse(roles);
        },
      );
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

      return withSpan(
        `query:backend:event:${eventId}:users-with-role:${role}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT!,
          // );
          // const res = await client.evaluateExpression(
          //   `gno.land/r/zenao/events/e${eventId}`,
          //   `event.GetUsersWithRoleJSON(${JSON.stringify(role)})`,
          // );
          // const addresses = extractGnoJSONResponse(res);
          const res = await zenaoClient.usersWithRoles({
            org: {
              entityType: "event",
              entityId: eventId,
            },
            roles: [role],
          });
          return z.string().array().parse(res.usersWithRoles);
        },
      );
    },
  });
