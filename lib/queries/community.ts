import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import {
  InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { fromJson } from "@bufbuild/protobuf";
import { z } from "zod";
import { GetToken } from "@clerk/types";
import { extractGnoJSONResponse } from "../gno";
import { zenaoClient } from "@/lib/zenao-client";
import {
  CommunityInfo,
  CommunityInfoJson,
  CommunityInfoSchema,
} from "@/app/gen/zenao/v1/zenao_pb";

export const DEFAULT_COMMUNITIES_LIMIT = 20;

const communityUserRolesEnum = z.enum(["administrator", "member", "event"]);

export type CommunityUserRole = z.infer<typeof communityUserRolesEnum>;

export const communityGetUserRolesSchema = z.array(communityUserRolesEnum);

const communityUsersWithRolesResponseSchema = z.object({
  address: z.string(),
  roles: z.string().array(),
});

export type CommunityUsersWithRolesResponseSchema = z.infer<
  typeof communityUsersWithRolesResponseSchema
>;

export const communityInfo = (communityId: string) =>
  queryOptions({
    queryKey: ["community", communityId],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/communities/c${communityId}`,
        `community.GetInfoJSON()`,
      );
      const community = extractGnoJSONResponse(res) as CommunityInfoJson;
      return fromJson(CommunityInfoSchema, community);
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
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/communityreg`,
        `communitiesToJSON(listCommunities(${limitInt}, ${pageParam * limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      const json = communitiesListFromJson(raw);

      return json;
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
  communityId: string | null,
  userAddress: string | null,
) =>
  queryOptions({
    queryKey: ["communityUserRoles", communityId, userAddress],
    queryFn: async () => {
      if (!communityId || !userAddress) {
        return [];
      }

      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/communities/c${communityId}`,
        `community.GetUserRolesJSON(${JSON.stringify(userAddress)})`,
      );
      const roles = extractGnoJSONResponse(res);
      return communityGetUserRolesSchema.parse(roles);
    },
  });

export const communityUsersWithRoles = (
  communityId: string,
  roles: CommunityUserRole[],
) =>
  queryOptions({
    queryKey: ["communityRoles", communityId, JSON.stringify(roles)],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/communities/c${communityId}`,
        `community.GetUsersWithRolesJSON(${goStringSliceLiteral(roles)})`,
      );
      const raw = extractGnoJSONResponse(res);

      return communityUsersWithRolesResponseSchema.array().parse(raw);
    },
  });

function communitiesListFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) =>
    fromJson(CommunityInfoSchema, elem as CommunityInfoJson),
  );
}

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
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");
      try {
        const res = await zenaoClient.getCommunityAdministrators(
          { communityId },
          { headers: { Authorization: "Bearer " + token } },
        );
        return res.administrators;
      } catch (error) {
        console.error("failed to fetch administrators", error);
        return [];
      }
    },
  });
