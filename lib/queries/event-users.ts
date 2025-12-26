import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";

export const DEFAULT_EVENT_PARTICIPANTS_LIMIT = 20;

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
          const res = await zenaoClient.entitiesWithRoles({
            org: {
              entityType: "event",
              entityId: eventId,
            },
            roles: [role],
          });
          const realmIds = res.entitiesWithRoles.map((u) => u.realmId);
          return z.string().array().parse(realmIds);
        },
      );
    },
  });
