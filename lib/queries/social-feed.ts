import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { fromJson } from "@bufbuild/protobuf";
import { tracer } from "../tracer";
import { extractGnoJSONResponse } from "@/lib/gno";
import { PostViewJson, PostViewSchema } from "@/app/gen/feeds/v1/feeds_pb";
import { PollJson, PollSchema } from "@/app/gen/polls/v1/polls_pb";

export const DEFAULT_FEED_POSTS_LIMIT = 30;
export const DEFAULT_FEED_POSTS_COMMENTS_LIMIT = 10;

export const feedPost = (postId: string, userAddress: string) =>
  queryOptions({
    queryKey: ["feedPost", postId, userAddress],
    queryFn: async () => {
      const span = tracer.startSpan(
        "query:post:" + postId + ":main:" + userAddress,
      );
      try {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );

        const res = await client.evaluateExpression(
          "gno.land/r/zenao/social_feed",
          `postViewToJSON(GetPostView(${postId}, "${userAddress}"))`,
        );
        const raw = extractGnoJSONResponse(res);

        return fromJson(PostViewSchema, raw as PostViewJson);
      } finally {
        span.end();
      }
    },
  });

export const feedPosts = (
  feedId: string,
  limit: number,
  tags: string,
  userAddress: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPosts", feedId, tags, userAddress],
    queryFn: async ({ pageParam = 0 }) => {
      const span = tracer.startSpan(
        "query:feed:" + feedId + ":posts:" + tags + ":" + userAddress,
      );
      try {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );

        const res = await client.evaluateExpression(
          "gno.land/r/zenao/social_feed",
          `postViewsToJSON(GetFeedPosts("${feedId}", ${pageParam * limit}, ${limit}, "${tags}", "${userAddress}"))`,
        );
        const raw = extractGnoJSONResponse(res);
        return postViewsFromJson(raw);
      } finally {
        span.end();
      }
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
  userAddress: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPostsChildren", parentId, tags, userAddress],
    queryFn: async ({ pageParam = 0 }) => {
      const span = tracer.startSpan(
        "query:post:" + parentId + ":children:" + tags + ":" + userAddress,
      );
      try {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );
        const res = await client.evaluateExpression(
          "gno.land/r/zenao/social_feed",
          `postViewsToJSON(GetChildrenPosts("${parentId}", ${pageParam * limit}, ${limit}, "${tags}", "${userAddress}"))`,
        );
        const raw = extractGnoJSONResponse(res);

        return postViewsFromJson(raw);
      } finally {
        span.end();
      }
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

export const pollInfo = (pollId: string, userAddress: string) =>
  queryOptions({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      const span = tracer.startSpan("query:poll:" + pollId + ":" + userAddress);
      try {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );

        const res = await client.evaluateExpression(
          "gno.land/r/zenao/polls",
          `pollToJSON(GetInfo(${parseInt(pollId, 10)}, "${userAddress}"))`,
        );

        const raw = extractGnoJSONResponse(res) as PollJson;
        return fromJson(PollSchema, raw);
      } finally {
        span.end();
      }
    },
  });
