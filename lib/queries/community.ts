import {
  InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { GetToken } from "@clerk/types";
import { withSpan } from "../tracer";
import { userIdFromPkgPath } from "./user";
import { zenaoClient } from "@/lib/zenao-client";
import { CommunityInfo } from "@/app/gen/zenao/v1/zenao_pb";

export const DEFAULT_COMMUNITIES_LIMIT = 20;

const communityUserRolesEnum = z.enum(["administrator", "member", "event"]);

export type CommunityUserRole = z.infer<typeof communityUserRolesEnum>;

export const communityGetUserRolesSchema = z.array(communityUserRolesEnum);

const communityUsersWithRolesResponseSchema = z
  .object({
    address: z.string(),
    roles: z.string().array(),
  })
  .transform(({ address, roles }) => ({ realmId: address, roles }));

export type CommunityUsersWithRolesResponseSchema = z.infer<
  typeof communityUsersWithRolesResponseSchema
>;

export const communityInfo = (communityId: string) =>
  queryOptions({
    queryKey: ["community", communityId],
    queryFn: async () => {
      return withSpan(`query:backend:community:${communityId}`, async () => {
        // const client = new GnoJSONRPCProvider(
        //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        // );
        // const res = await client.evaluateExpression(
        //   `gno.land/r/zenao/communities/c${communityId}`,
        //   `community.GetInfoJSON()`,
        // );
        const res = await zenaoClient.getCommunity({ communityId });
        return res.community;
      });
    },
  });

export const communitiesList = (
  limit: number,
  options?: Omit<
    UseInfiniteQueryOptions<
      CommunityInfo[],
      Error,
      InfiniteData<CommunityInfo[]>,
      (string | number)[],
      number // pageParam type
    >,
    | "queryKey"
    | "queryFn"
    | "getNextPageParam"
    | "initialPageParam"
    | "getPreviousPageParam"
  >,
) => {
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    initialPageParam: 0,
    queryKey: ["communities", limitInt],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(`query:backend:communities`, async () => {
        // const client = new GnoJSONRPCProvider(
        //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        // );
        // const res = await client.evaluateExpression(
        //   `gno.land/r/zenao/communityreg`,
        //   `communitiesToJSON(listCommunities(${limitInt}, ${pageParam * limitInt}))`,
        // );

        const res = await zenaoClient.listCommunities({
          limit: limitInt,
          offset: pageParam * limitInt,
        });

        return res.communities;
      });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (firstPage, pages) => {
      if (firstPage.length < limitInt) {
        return undefined;
      }
      return pages.length - 2;
    },
    ...options,
  });
};

export const communitiesListByMember = (
  memberAddress: string | null,
  limit: number,
  options?: Omit<
    UseInfiniteQueryOptions<
      CommunityInfo[],
      Error,
      InfiniteData<CommunityInfo[]>,
      (string | number)[],
      number // pageParam type
    >,
    | "queryKey"
    | "queryFn"
    | "getNextPageParam"
    | "initialPageParam"
    | "getPreviousPageParam"
  >,
) => {
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    initialPageParam: 0,
    queryKey: ["communitiesByMember", memberAddress ?? "", limitInt],
    enabled: !!memberAddress,
    queryFn: async ({ pageParam = 0 }) => {
      if (!memberAddress) {
        return [] as CommunityInfo[];
      }
      return withSpan(
        `query:backend:communities-by-member:${userIdFromPkgPath(memberAddress)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );
          // const res = await client.evaluateExpression(
          //   `gno.land/r/zenao/communityreg`,
          //   `communitiesToJSON(listCommunitiesByMembers(${JSON.stringify(memberAddress)}, ${limitInt}, ${pageParam * limitInt}))`,
          // );
          // const raw = extractGnoJSONResponse(res);
          // const json = communitiesListFromJson(raw);

          const res = await zenaoClient.listCommunitiesByMember({
            memberId: userIdFromPkgPath(memberAddress),
            limit: limitInt,
            offset: pageParam * limitInt,
          });
          const json = res.communities;

          return json;
        },
      );
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (firstPage, pages) => {
      if (firstPage.length < limitInt) {
        return undefined;
      }
      return pages.length - 2;
    },
    ...options,
  });
};

export const communityUserRoles = (
  communityId: string | null | undefined,
  userRealmId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["communityUserRoles", communityId, userRealmId],
    queryFn: async () => {
      if (!communityId || !userRealmId) {
        return [];
      }

      return withSpan(
        `query:backend:community:${communityId}:user-roles:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );
          // const res = await client.evaluateExpression(
          //   `gno.land/r/zenao/communities/c${communityId}`,
          //   `community.GetUserRolesJSON(${JSON.stringify(userRealmId)})`,
          // );
          // const roles = extractGnoJSONResponse(res);
          const res = await zenaoClient.entityRoles({
            org: {
              entityType: "community",
              entityId: communityId,
            },
            entity: {
              entityType: "user",
              entityId: userIdFromPkgPath(userRealmId),
            },
          });
          const roles = res.roles;
          return communityGetUserRolesSchema.parse(roles);
        },
      );
    },
    enabled: !!communityId && !!userRealmId,
  });

export const communityUsersWithRoles = (
  communityId: string,
  roles: CommunityUserRole[],
) =>
  queryOptions({
    queryKey: ["communityRoles", communityId, JSON.stringify(roles)],
    queryFn: async () => {
      return withSpan(
        `query:backend:community:${communityId}:users-with-roles:${roles.join(",")}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );
          // const res = await client.evaluateExpression(
          //   `gno.land/r/zenao/communities/c${communityId}`,
          //   `community.GetUsersWithRolesJSON(${goStringSliceLiteral(roles)})`,
          // );
          // const raw = extractGnoJSONResponse(res);

          const res = await zenaoClient.usersWithRoles({
            org: {
              entityType: "community",
              entityId: communityId,
            },
            roles,
          });

          return communityUsersWithRolesResponseSchema
            .array()
            .parse(res.usersWithRoles);
        },
      );
    },
  });

export function goStringSliceLiteral(arr: string[]): string {
  return `[]string{${arr.map((s) => JSON.stringify(s)).join(",")}}`;
}

export function communityIdFromPkgPath(pkgPath: string): string {
  const res = /(c\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}

export const communityAdministratorsQuery = (
  getToken: GetToken,
  communityId: string,
) =>
  queryOptions({
    queryKey: ["community-admins", communityId],
    queryFn: async () => {
      return withSpan(
        `query:backend:community:${communityId}:administrators`,
        async () => {
          const token = await getToken();

          if (!token) throw new Error("invalid clerk token");

          try {
            const res = await zenaoClient.getCommunityAdministrators(
              { communityId },
              { headers: { Authorization: "Bearer " + token } },
            );

            return res.administrators;
          } catch (_) {
            return [];
          }
        },
      );
    },
  });

export const communitiesListByEvent = (
  id: string,
  limit: number,
  options?: Omit<
    UseInfiniteQueryOptions<
      CommunityInfo[],
      Error,
      InfiniteData<CommunityInfo[]>,
      (string | number)[],
      number // pageParam type
    >,
    | "queryKey"
    | "queryFn"
    | "getNextPageParam"
    | "initialPageParam"
    | "getPreviousPageParam"
  >,
) => {
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    initialPageParam: 0,
    queryKey: ["communitiesByEvent", id, limitInt],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(`query:backend:event:${id}:communities`, async () => {
        // const client = new GnoJSONRPCProvider(
        //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        // );
        // const pkgPath = `gno.land/r/zenao/events/e${id}`;
        // const res = await client.evaluateExpression(
        //   `gno.land/r/zenao/communityreg`,
        //   `communitiesToJSON(listCommunitiesByEvent(${JSON.stringify(pkgPath)}, ${limitInt}, ${pageParam * limitInt}))`,
        // );
        // const raw = extractGnoJSONResponse(res);
        // const json = communitiesListFromJson(raw);

        const res = await zenaoClient.listCommunitiesByEvent({
          eventId: id,
          limit: limitInt,
          offset: pageParam * limitInt,
        });
        return res.communities;
      });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (firstPage, pages) => {
      if (firstPage.length < limitInt) {
        return undefined;
      }
      return pages.length - 2;
    },
    ...options,
  });
};
