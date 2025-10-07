"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { userAddressOptions } from "@/lib/queries/user";
import { PollPostView } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { PollsList } from "@/components/social-feed/polls-list";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import { derivePkgAddr } from "@/lib/gno";
import { communityUserRoles } from "@/lib/queries/community";
import { usePwaContext } from "@/components/providers/pwa-state-provider";

type CommunityPollsProps = {
  communityId: string;
};

function CommunityPolls({ communityId }: CommunityPollsProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress),
  );

  const { onDisplayBottomBarChange } = usePwaContext();

  const pkgPath = `gno.land/r/zenao/communities/c${communityId}`;
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

  const { onReactionChange, isReacting } = useFeedPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(feedId);

  useEffect(() => {
    if (userRoles.includes("member") || userRoles.includes("administrator")) {
      onDisplayBottomBarChange(false);
    }

    return () => {
      onDisplayBottomBarChange(true);
    };
  }, [onDisplayBottomBarChange, userRoles]);

  return (
    <>
      <div className="space-y-4">
        {!polls.length ? (
          <EmptyList
            title={t("feed.no-polls-title")}
            description={t("feed.no-polls-description")}
          />
        ) : (
          <PollsList
            polls={polls}
            userAddress={userAddress}
            onReactionChange={onReactionChange}
            canInteract={
              userRoles.includes("member") ||
              userRoles.includes("administrator")
            }
            onDelete={onDelete}
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

export default CommunityPolls;
