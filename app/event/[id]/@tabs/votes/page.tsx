"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import React from "react";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { PollPostView } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { PollsList } from "@/components/social-feed/polls-list";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import useEventPostReactionHandler from "@/hooks/use-event-post-reaction-handler";
import useEventPostDeleteHandler from "@/hooks/use-event-post-delete-handler";
import { derivePkgAddr } from "@/lib/gno";

type EventPollsProps = {
  params: Promise<{ id: string }>;
};

function EventPolls({ params }: EventPollsProps) {
  const { id: eventId } = React.use(params);

  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );

  const pkgPath = `gno.land/r/zenao/events/e${eventId}`;
  const feedId = `${derivePkgAddr(pkgPath)}:main`;

  const {
    data: pollsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(feedId, DEFAULT_FEED_POSTS_LIMIT, "poll", userAddress || ""),
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

  const { onReactionChange, isReacting } = useEventPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useEventPostDeleteHandler(feedId);

  return (
    <>
      <div className="space-y-4">
        {!polls.length ? (
          <EmptyList
            title={t("event-feed.no-polls-title")}
            description={t("event-feed.no-polls-description")}
          />
        ) : (
          <PollsList
            polls={polls}
            userAddress={userAddress}
            onReactionChange={onReactionChange}
            canInteract={
              roles.includes("organizer") || roles.includes("participant")
            }
            onDelete={onDelete}
            replyHrefFormatter={(postId) =>
              `/event/${eventId}/feed/post/${postId}`
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
