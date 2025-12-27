"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import { useAccount } from "wagmi";
import { eventUserRoles } from "@/lib/queries/event-users";
import { PollPostView } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { PollsList } from "@/components/social-feed/lists/polls-list";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";

type EventPollsProps = {
  params: Promise<{ id: string }>;
};

function EventPolls({ params }: EventPollsProps) {
  const { id: eventId } = React.use(params);
  const t = useTranslations();
  const { address } = useAccount();
  const userRealmId = address;

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  const pkgPath = `gno.land/r/zenao/events/e${eventId}`;
  const feedId = `${pkgPath}:main`;

  const {
    data: pollsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(feedId, DEFAULT_FEED_POSTS_LIMIT, "poll", userRealmId || ""),
  );

  const polls = useMemo(
    () =>
      pollsPages.pages.flat().filter((post): post is PollPostView => {
        return (
          post.post?.post.case === "link" && post.post?.tags?.includes("poll")
        );
      }),
    [pollsPages],
  );

  const { onReactionChange, isReacting } = useFeedPostReactionHandler(
    "event",
    eventId,
    feedId,
  );
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(
    "event",
    eventId,
    feedId,
  );

  return (
    <>
      <div className="space-y-4">
        {!polls.length ? (
          <EmptyList
            title={t("social-feed.no-polls-title")}
            description={t("social-feed.no-polls-description")}
          />
        ) : (
          <PollsList
            polls={polls}
            userRealmId={userRealmId || null}
            onReactionChange={onReactionChange}
            canInteract={
              roles.includes("organizer") || roles.includes("participant")
            }
            onDelete={onDelete}
            replyHrefFormatter={(postId) =>
              `feed/event/${eventId}/post/${postId}`
            }
            canReply
            isReacting={isReacting}
            isDeleting={isDeleting}
          />
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

export default EventPolls;
