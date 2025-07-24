"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { userAddressOptions } from "@/lib/queries/user";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { PostsList } from "@/components/social-feed/posts-list";
import { eventUserRoles } from "@/lib/queries/event-users";
import useEventPostReactionHandler from "@/hooks/use-event-post-reaction-handler";
import useEventPostDeleteHandler from "@/hooks/use-event-post-delete-handler";
import useEventPostEditHandler from "@/hooks/use-event-post-edit-handler";

type EventFeedProps = {
  eventId: string;
};

function EventFeed({ eventId }: EventFeedProps) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );
  const t = useTranslations();

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

  const { onEditStandardPost, isEditing } = useEventPostEditHandler(eventId);
  const { onReactionChange, isReacting } = useEventPostReactionHandler(eventId);
  const { onDelete, isDeleting } = useEventPostDeleteHandler(eventId);

  return (
    <>
      <div className="space-y-4">
        {!posts.length ? (
          <EmptyList
            title={t("no-posts-title")}
            description={t("no-posts-description")}
          />
        ) : (
          <PostsList
            posts={posts}
            userAddress={userAddress}
            onEdit={onEditStandardPost}
            onReactionChange={onReactionChange}
            canInteract={
              roles.includes("organizer") || roles.includes("participant")
            }
            onDelete={onDelete}
            replyHrefFormatter={(postId) =>
              `/event/${eventId}/feed/post/${postId}`
            }
            canReply
            isEditing={isEditing}
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
          page={posts}
          noMoreLabel={t("no-more-posts")}
        />
      </div>
    </>
  );
}

export default EventFeed;
