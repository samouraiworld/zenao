"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { userInfoOptions } from "@/lib/queries/user";
import { PollPostView } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { PollsList } from "@/components/social-feed/lists/polls-list";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import { communityUserRoles } from "@/lib/queries/community";

type CommunityPollsProps = {
  communityId: string;
};

function CommunityPolls({ communityId }: CommunityPollsProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, userRealmId),
  );

  const pkgPath = `gno.land/r/zenao/communities/c${communityId}`;
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

  const { onReactionChange, isReacting } = useFeedPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(feedId);

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
            userRealmId={userRealmId}
            onReactionChange={onReactionChange}
            canInteract={
              userRoles.includes("member") ||
              userRoles.includes("administrator")
            }
            onDelete={onDelete}
            replyHrefFormatter={(postId) =>
              `/community/${communityId}/feed/post/${postId}`
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

export default CommunityPolls;
