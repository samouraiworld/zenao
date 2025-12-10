import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { createClient, gql } from "urql";
import { cacheExchange, fetchExchange } from "@urql/core";
import { createPublicClient, http } from "viem";
import Safe from "@safe-global/protocol-kit";
import { withSpan } from "../tracer";
import {
  EventGatekeeperRoleKey,
  EventOrganizerRoleKey,
  EventParticipantRoleKey,
  EventTicketsMasterRoleKey,
} from "../zodiac";

const eventUserRolesEnum = z.enum(["organizer", "participant", "gatekeeper"]);

export type EventUserRole = z.infer<typeof eventUserRolesEnum>;

export const eventGetUserRolesSchema = z.array(eventUserRolesEnum);

const thegraphAPIKey = "b7c54ab5dcb127031f24db48ac7bb373";

const thegraphClient = createClient({
  url: `https://gateway.thegraph.com/api/${thegraphAPIKey}/subgraphs/id/J1XwDb2YgWRHT6iwLKyMWzckcDkks3APHytsDY1tG7GZ`,
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
});

const DATA_QUERY = (
  rolesModAddr: `0x${string}`,
  memberAddr: `0x${string}`,
) => gql`
  {
    roleAssignments(
      where: {
        member: "${rolesModAddr}-MEMBER-${memberAddr}"
      }
    ) {
      role {
        key
      }
    }
  }
`;

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
        `query:chain:event:${eventId}:user-roles:${userRealmId}`,
        async () => {
          const client = createPublicClient({
            transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
          });

          const protocolKit = await Safe.init({
            safeAddress: eventId,
            provider: client.transport,
          });

          const modules = await protocolKit.getModules();
          const rolesModAddr = modules[0] as `0x${string}`;

          const result = await thegraphClient
            .query(
              DATA_QUERY(
                rolesModAddr.toLowerCase() as `0x${string}`,
                userRealmId.toLowerCase() as `0x${string}`,
              ),
              {},
            )
            .toPromise();

          const res = result.data as {
            roleAssignments: { role: { key: string } }[];
          }; // TODO: proper typing

          return eventGetUserRolesSchema.parse(
            res.roleAssignments.map((r) => {
              switch (r.role.key) {
                case EventOrganizerRoleKey:
                  return "organizer";
                case EventTicketsMasterRoleKey:
                  return "tickets_master";
                case EventGatekeeperRoleKey:
                  return "gatekeeper";
                case EventParticipantRoleKey:
                  return "participant";
              }
              throw new Error("unknown role key: " + r.role.key);
            }),
          );
        },
      );
    },
  });

const USERS_WITH_ROLE_DATA_QUERY = (
  rolesModAddr: `0x${string}`,
  roleKey: `0x${string}`,
) => gql`
  {
    roleAssignments(
      where: {
        role: "${rolesModAddr}-ROLE-${roleKey}"
      }
    ) {
      member {
        address
      }
    }
  }
`;

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
        `query:chain:event:${eventId}:users-with-role:${role}`,
        async () => {
          const client = createPublicClient({
            transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
          });

          const protocolKit = await Safe.init({
            safeAddress: eventId,
            provider: client.transport,
          });

          const modules = await protocolKit.getModules();
          const rolesModAddr = modules[0] as `0x${string}`;

          let roleKey: `0x${string}` = "0x";
          switch (role) {
            case "organizer":
              roleKey = EventOrganizerRoleKey;
              break;
            case "participant":
              roleKey = EventParticipantRoleKey;
              break;
            case "gatekeeper":
              roleKey = EventGatekeeperRoleKey;
              break;
          }

          const result = await thegraphClient
            .query(
              USERS_WITH_ROLE_DATA_QUERY(
                rolesModAddr.toLowerCase() as `0x${string}`,
                roleKey,
              ),
              {},
            )
            .toPromise();

          console.log("users with role", eventId, role, result);

          const res = result.data as {
            roleAssignments: { member: { address: string } }[];
          }; // TODO: proper typing

          return z
            .string()
            .array()
            .parse(res.roleAssignments.map((r) => r.member.address));
        },
      );
    },
  });
