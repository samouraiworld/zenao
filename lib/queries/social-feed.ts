import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";
import { eventIdFromPkgPath } from "./event";
import { communityIdFromPkgPath } from "./community";

export const DEFAULT_FEED_POSTS_LIMIT = 30;
export const DEFAULT_FEED_POSTS_COMMENTS_LIMIT = 10;

export const feedPost = (postId: string, userRealmId: string) =>
  queryOptions({
    queryKey: ["feedPost", postId, userRealmId],
    queryFn: async () => {
      return withSpan(
        `query:backend:post:${postId}:main:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          const res = await zenaoClient.getPost({
            postId,
            userId: userIdFromPkgPath(userRealmId),
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
  userRealmId: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPosts", feedId, tags, userRealmId],
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:backend:feed:${feedId}:posts:${tags}:${userIdFromPkgPath(userRealmId)}`,
        async () => {
          const pkgPath = feedId.split(":")[0];
          const orgType = pkgPath.includes("events/") ? "event" : "community";
          const orgId =
            orgType === "event"
              ? eventIdFromPkgPath(pkgPath)
              : communityIdFromPkgPath(pkgPath);

          const res = await zenaoClient.getFeedPosts({
            org: {
              entityType: orgType,
              entityId: orgId,
            },
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
          const res = await zenaoClient.getPoll({
            pollId,
            userId: userIdFromPkgPath(userRealmId),
          });
          if (res.poll == null) {
            throw new Error("poll not found");
          }
          return res.poll;
        },
      );
    },
  });
