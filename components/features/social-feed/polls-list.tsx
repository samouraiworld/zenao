"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PollPost } from "./poll-post";
import { PostCardSkeleton } from "./post-card-skeleton";
import { PollPostView } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import Text from "@/components/widgets/texts/text";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";

function EmptyPollsList() {
  const t = useTranslations("event-feed");
  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">{t("no-polls-title")}</Text>
      <Text size="sm" variant="secondary">
        {t("no-polls-description")}
      </Text>
    </div>
  );
}

export function PollsList({
  eventId,
  userAddress,
}: {
  eventId: string;
  userAddress: string | null;
}) {
  const {
    data: pollsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(eventId, DEFAULT_FEED_POSTS_LIMIT, "poll", userAddress || ""),
  );
  const t = useTranslations("event-feed");

  const polls = useMemo(
    () =>
      pollsPages.pages.flat().filter((post): post is PollPostView => {
        return (
          post.post?.post.case === "link" && post.post?.tags?.includes("poll")
        );
      }),
    [pollsPages],
  );

  return (
    <>
      <div className="space-y-4">
        {!polls.length ? (
          <EmptyPollsList />
        ) : (
          polls.map((pollPost) => {
            const { pollId } = parsePollUri(pollPost.post.post.value.uri);

            return (
              <Suspense fallback={<PostCardSkeleton />} key={pollId}>
                <PollPost
                  eventId={eventId}
                  pollId={pollId}
                  pollPost={pollPost}
                />
              </Suspense>
            );
          })
        )}
      </div>
      <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={polls}
          noMoreLabel={t("no-more-posts")}
        />
      </div>
    </>
  );
}
