"use client";

import { Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { PostCardSkeleton } from "./post-card-skeleton";
import { PollPost } from "./poll-post";
import { StandardPostCard } from "@/components/features/social-feed/standard-post-card";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import EmptyList from "@/components/widgets/lists/empty-list";

export function PostsList({
  eventId,
  userAddress,
}: {
  eventId: string;
  userAddress: string | null;
}) {
  const t = useTranslations("event-feed");
  // Event's social feed posts
  const {
    data: postsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(eventId, DEFAULT_FEED_POSTS_LIMIT, "", userAddress || ""),
  );
  const posts = useMemo(
    () =>
      postsPages.pages.flat().map<SocialFeedPost>((post) => {
        if (isPollPost(post)) {
          return {
            postType: "poll",
            data: post,
          };
        } else if (isStandardPost(post)) {
          return {
            postType: "standard",
            data: post,
          };
        }
        return {
          postType: "unknown",
          data: post,
        };
      }),
    [postsPages],
  );

  return (
    <>
      <div className="space-y-4">
        {!posts.length ? (
          <EmptyList
            title={t("no-posts-title")}
            description={t("no-posts-description")}
          />
        ) : (
          posts.map((post) => {
            switch (post.postType) {
              case "standard":
                return (
                  <Suspense
                    key={post.data.post.localPostId}
                    fallback={<PostCardSkeleton />}
                  >
                    <StandardPostCard
                      eventId={eventId}
                      post={post.data}
                      canReply
                    />
                  </Suspense>
                );
              case "poll":
                const { pollId } = parsePollUri(post.data.post.post.value.uri);

                return (
                  <Suspense
                    fallback={<PostCardSkeleton />}
                    key={post.data.post.localPostId}
                  >
                    <PollPost
                      eventId={eventId}
                      pollId={pollId}
                      pollPost={post.data}
                    />
                  </Suspense>
                );

              case "unknown":
                return null;
            }
          })
        )}
      </div>
      <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={posts}
          noMoreLabel={t("no-more-posts")}
        />
      </div>
    </>
  );
}
