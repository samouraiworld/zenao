import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";

export const DEFAULT_FEED_POSTS_LIMIT = 30;
export const DEFAULT_FEED_POSTS_COMMENTS_LIMIT = 10;

export const feedPost = (postId: string, userRealmId: string) =>
  queryOptions({
    queryKey: ["feedPost", postId, userRealmId],
    queryFn: async () => {
      return withSpan(
        `query:backend:post:${postId}:main:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );

          // const res = await client.evaluateExpression(
          //   "gno.land/r/zenao/social_feed",
          //   `postViewToJSON(GetPostView(${postId}, "${userRealmId}"))`,
          // );
          // const raw = extractGnoJSONResponse(res);

          // return fromJson(PostViewSchema, raw as PostViewJson);
          const res = await zenaoClient.getPost({
            postId,
            userId: userIdFromPkgPath(userRealmId),
          });
          return res;
        },
      );
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
        `query:backend:feed:${feedId}:posts:${tags}:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );

          // const res = await client.evaluateExpression(
          //   "gno.land/r/zenao/social_feed",
          //   `postViewsToJSON(GetFeedPosts("${feedId}", ${pageParam * limit}, ${limit}, "${tags}", "${userRealmId}"))`,
          // );
          // const raw = extractGnoJSONResponse(res);
          // return postViewsFromJson(raw);
          const res = await zenaoClient.getFeedPosts({
            feedId,
            offset: pageParam * limit,
            limit,
            tags: tags ? tags.split(",") : [],
            userId: userIdFromPkgPath(userRealmId),
          });
          return res.posts;
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
        `query:backend:post:${parentId}:${tags}:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );
          // const res = await client.evaluateExpression(
          //   "gno.land/r/zenao/social_feed",
          //   `postViewsToJSON(GetChildrenPosts("${parentId}", ${pageParam * limit}, ${limit}, "${tags}", "${userRealmId}"))`,
          // );
          // const raw = extractGnoJSONResponse(res);

          // return postViewsFromJson(raw);
          const res = await zenaoClient.getChildrenPosts({
            parentId,
            offset: pageParam * limit,
            limit,
            tags: tags ? tags.split(",") : [],
            userId: userIdFromPkgPath(userRealmId),
          });
          return res.posts;
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

export const pollInfo = (pollId: string, userRealmId: string) =>
  queryOptions({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      return withSpan(
        `query:backend:poll:${pollId}:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          // const client = new GnoJSONRPCProvider(
          //   process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          // );

          // const res = await client.evaluateExpression(
          //   "gno.land/r/zenao/polls",
          //   `pollToJSON(GetInfo(${parseInt(pollId, 10)}, "${userRealmId}"))`,
          // );

          // const raw = extractGnoJSONResponse(res) as PollJson;
          // return fromJson(PollSchema, raw);
          const res = await zenaoClient.getPoll({
            pollId,
            userId: userIdFromPkgPath(userRealmId),
          });
          return res;
        },
      );
    },
  });
