import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";

export const DEFAULT_FEED_POSTS_LIMIT = 30;
export const DEFAULT_FEED_POSTS_COMMENTS_LIMIT = 10;

export const feedPost = (postId: string, userId: string) =>
  queryOptions({
    queryKey: ["feedPost", postId, userId],
    queryFn: async () => {
      return withSpan(
        `query:backend:post:${postId}:main:${userId}`,
        async () => {
          const res = await zenaoClient.getPost({
            postId,
            userId,
          });
          if (res.post == null) {
            throw new Error("post not found");
          }
          return res.post;
        },
      );
    },
  });

export const feedPosts = (
  feedId: string,
  limit: number,
  tags: string,
  userId: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPosts", feedId, tags, userId],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:backend:feed:${feedId}:posts:${tags}:${userId}`,
        async () => {
          const parts = feedId.split(":");
          const orgType = parts[0]; // "event" or "community"
          const orgId = parts[1];

          const res = await zenaoClient.getFeedPosts({
            org: {
              entityType: orgType,
              entityId: orgId,
            },
            offset: pageParam * limit,
            limit,
            tags: tags ? tags.split(",") : [],
            userId,
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
  userId: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPostsChildren", parentId, tags, userId],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:backend:post:${parentId}:${tags}:${userId}`,
        async () => {
          const res = await zenaoClient.getChildrenPosts({
            parentId,
            offset: pageParam * limit,
            limit,
            tags: tags ? tags.split(",") : [],
            userId,
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

export const pollInfo = (pollId: string, userId: string) =>
  queryOptions({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      return withSpan(`query:backend:poll:${pollId}:${userId}`, async () => {
        const res = await zenaoClient.getPoll({
          pollId,
          userId,
        });
        if (res.poll == null) {
          throw new Error("poll not found");
        }
        return res.poll;
      });
    },
  });
