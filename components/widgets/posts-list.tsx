"use client";

import { Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import Text from "../texts/text";
import { PostCardSkeleton } from "../loader/social-feed/post-card-skeleton";
import { PollPost } from "../widgets/poll-post";
import { LoaderMoreButton } from "../buttons/load-more-button";
import { FeedPostFormSchemaType } from "../form/types";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { parsePollUri } from "@/lib/multiaddr";

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
  form,
}: {
  eventId: string;
  userAddress: string | null;
  form: UseFormReturn<FeedPostFormSchemaType>;
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
                    <StandardPostCard
                      eventId={eventId}
                      post={post.data}
                      form={form}
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
                      form={form}
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
