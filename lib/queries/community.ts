import {
  InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { GetToken } from "@clerk/types";
import { withSpan } from "../tracer";
import { zenaoClient } from "@/lib/zenao-client";
import { CommunityInfo, CommunityUser } from "@/app/gen/zenao/v1/zenao_pb";

export const DEFAULT_COMMUNITIES_LIMIT = 20;

const communityUserRolesEnum = z.enum(["administrator", "member", "event"]);

export type CommunityUserRole = z.infer<typeof communityUserRolesEnum>;

export const communityGetUserRolesSchema = z.array(communityUserRolesEnum);

const communityUsersWithRolesResponseSchema = z
  .object({
    entityType: z.string(),
    entityId: z.string(),
    roles: z.string().array(),
  })
  .transform(({ entityType, entityId, roles }) => ({
    entityType,
    entityId,
    roles,
  }));

export type CommunityUsersWithRolesResponseSchema = z.infer<
  typeof communityUsersWithRolesResponseSchema
>;

export const communityInfo = (communityId: string) =>
  queryOptions({
    queryKey: ["community", communityId],
    queryFn: async () => {
      return withSpan(`query:backend:community:${communityId}`, async () => {
        const res = await zenaoClient.getCommunity({ communityId });
        if (res.community == null) {
          throw new Error("community not found");
        }
        return res.community;
      });
    },
  });

export const communityAdministrators = (
  communityId: string,
  getToken: GetToken,
) =>
  queryOptions({
    queryKey: ["communityAdmins", communityId],
    queryFn: async () => {
      return withSpan(
        `query:backend:community:${communityId}:administrators`,
        async () => {
          const token = await getToken();
          if (!token) throw new Error("invalid clerk token");
          const res = await zenaoClient.getCommunityAdministrators(
            { communityId },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          return res.administrators;
        },
      );
    },
    initialData: [],
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

export const communityUserRoles = (
  communityId: string | null | undefined,
  userId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["communityUserRoles", communityId, userId],
    queryFn: async () => {
      if (!communityId || !userId) {
        return [];
      }

      return withSpan(
        `query:backend:community:${communityId}:user-roles:${userId}`,
        async () => {
          const res = await zenaoClient.entityRoles({
            org: {
              entityType: "community",
              entityId: communityId,
            },
            entity: {
              entityType: "user",
              entityId: userId,
            },
          });
          const roles = res.roles;
          return communityGetUserRolesSchema.parse(roles);
        },
      );
    },
    enabled: !!communityId && !!userId,
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
          const res = await zenaoClient.entitiesWithRoles({
            org: {
              entityType: "community",
              entityId: communityId,
            },
            roles,
          });

          return communityUsersWithRolesResponseSchema
            .array()
            .parse(res.entitiesWithRoles);
        },
      );
    },
  });

export function goStringSliceLiteral(arr: string[]): string {
  return `[]string{${arr.map((s) => JSON.stringify(s)).join(",")}}`;
}

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

export const communitiesByUserRolesList = (
  userId: string | undefined,
  roles: CommunityUserRole[],
  limit: number,
  getToken?: GetToken,
  options?: Omit<
    UseInfiniteQueryOptions<
      CommunityUser[],
      Error,
      InfiniteData<CommunityUser[]>,
      (string | number | CommunityUserRole[])[],
      number
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
    queryKey: ["communitiesByUserRoles", userId ?? "", roles, limitInt],
    enabled: !!userId,
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) {
        return [] as CommunityUser[];
      }
      return withSpan(
        `query:backend:communities-by-user-roles:${userId}`,
        async () => {
          const token = getToken ? await getToken() : null;
          const res = await zenaoClient.listCommunitiesByUserRoles(
            {
              userId,
              roles,
              limit: limitInt,
              offset: pageParam * limitInt,
            },
            token ? { headers: { Authorization: `Bearer ${token}` } } : {},
          );

          return res.communities;
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
