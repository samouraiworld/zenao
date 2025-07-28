import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import {
  InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { fromJson } from "@bufbuild/protobuf";
import { z } from "zod";
import { extractGnoJSONResponse } from "../gno";
import {
  CommunityInfo,
  CommunityInfoJson,
  CommunityInfoSchema,
} from "@/app/gen/zenao/v1/zenao_pb";

const communityUserRolesEnum = z.enum(["administrator", "member"]);

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
        `gno.land/r/zenao/eventreg`,
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
        `community.GetUsersWithRolesJSON(${jsonStringArrayIntoGoArray(roles)})`,
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

function jsonStringArrayIntoGoArray(arr: string[]): string {
  return `[]string${JSON.stringify(arr).replace("[", "{").replace("]", "}")}`;
}
