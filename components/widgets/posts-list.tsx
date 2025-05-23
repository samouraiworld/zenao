"use client";

import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { parsePollUri } from "@/lib/multiaddr";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { LoaderMoreButton } from "../buttons/load-more-button";
import { PostCardSkeleton } from "../loader/social-feed/post-card-skeleton";
import Text from "../texts/text";
import { PollPost } from "../widgets/poll-post";

function EmptyPostsList() {
  const t = useTranslations("event-feed");

  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">{t("no-posts-title")}</Text>
      <Text size="sm" variant="secondary">
        {t("no-posts-description")}
      </Text>
    </div>
  );
}

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

  console.log(postsPages)

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
          <EmptyPostsList />
        ) : (
          posts.map((post) => {
            switch (post.postType) {
              case "standard":
                return (
                  <Suspense
                    key={post.data.post.localPostId}
                    fallback={<PostCardSkeleton />}
                  >
                    <StandardPostCard eventId={eventId} post={post.data} />
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
      <LoaderMoreButton
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        page={posts}
        noMoreLabel={t("no-more-posts")}
      />
    </>
  );
}
