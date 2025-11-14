import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { fromJson } from "@bufbuild/protobuf";
import { withSpan } from "../tracer";
import { extractGnoJSONResponse } from "@/lib/gno";
import { PostViewJson, PostViewSchema } from "@/app/gen/feeds/v1/feeds_pb";
import { PollJson, PollSchema } from "@/app/gen/polls/v1/polls_pb";

export const DEFAULT_FEED_POSTS_LIMIT = 30;
export const DEFAULT_FEED_POSTS_COMMENTS_LIMIT = 10;

export const feedPost = (postId: string, userRealmId: string) =>
  queryOptions({
    queryKey: ["feedPost", postId, userRealmId],
    queryFn: async () => {
      return withSpan(`query:post:${postId}:main:${userRealmId}`, async () => {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );

        const res = await client.evaluateExpression(
          "gno.land/r/zenao/social_feed",
          `postViewToJSON(GetPostView(${postId}, "${userRealmId}"))`,
        );
        const raw = extractGnoJSONResponse(res);

        return fromJson(PostViewSchema, raw as PostViewJson);
      });
    },
  });

export const feedPosts = (
  feedId: string,
  limit: number,
  tags: string,
  userRealmId: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPosts", feedId, tags, userRealmId],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:feed:${feedId}:posts:${tags}:${userRealmId}`,
        async () => {
          const client = new GnoJSONRPCProvider(
            process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          );

          const res = await client.evaluateExpression(
            "gno.land/r/zenao/social_feed",
            `postViewsToJSON(GetFeedPosts("${feedId}", ${pageParam * limit}, ${limit}, "${tags}", "${userRealmId}"))`,
          );
          const raw = extractGnoJSONResponse(res);
          return postViewsFromJson(raw);
        },
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limit) {
        return undefined;
      }
      return pages.length;
    },
  });

export const feedPostsChildren = (
  parentId: string,
  limit: number,
  tags: string,
  userRealmId: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPostsChildren", parentId, tags, userRealmId],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:post:${parentId}:${tags}:${userRealmId}`,
        async () => {
          const client = new GnoJSONRPCProvider(
            process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          );
          const res = await client.evaluateExpression(
            "gno.land/r/zenao/social_feed",
            `postViewsToJSON(GetChildrenPosts("${parentId}", ${pageParam * limit}, ${limit}, "${tags}", "${userRealmId}"))`,
          );
          const raw = extractGnoJSONResponse(res);

          return postViewsFromJson(raw);
        },
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limit) {
        return undefined;
      }
      return pages.length;
    },
  });

function postViewsFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) => fromJson(PostViewSchema, elem as PostViewJson));
}

export const pollInfo = (pollId: string, userRealmId: string) =>
  queryOptions({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      return withSpan(`query:poll:${pollId}:${userRealmId}`, async () => {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );

        const res = await client.evaluateExpression(
          "gno.land/r/zenao/polls",
          `pollToJSON(GetInfo(${parseInt(pollId, 10)}, "${userRealmId}"))`,
        );

        const raw = extractGnoJSONResponse(res) as PollJson;
        return fromJson(PollSchema, raw);
      });
    },
  });
