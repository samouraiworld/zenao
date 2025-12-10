"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { eventUserRoles } from "@/lib/queries/event-users";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { PostsList } from "@/components/social-feed/lists/posts-list";

type EventFeedProps = {
  params: Promise<{ id: string }>;
};

function EventFeed({ params }: EventFeedProps) {
  const { id: eventId } = React.use(params);
  const { address } = useAccount();

  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));

  const userRealmId = address || "";

  const [postInEdition, setPostInEdition] = useState<{
    postId: string;
    content: string;
  } | null>(null);

  const t = useTranslations();

  // Event's social feed posts
  const pkgPath = `gno.land/r/zenao/events/e${eventId}`;
  const feedId = `${pkgPath}:main`;

  const {
    data: postsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(feedId, DEFAULT_FEED_POSTS_LIMIT, "", userRealmId),
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

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(
    "event",
    eventId,
    feedId,
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

  const onEdit = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => {
    await onEditStandardPost(postId, values);
    setPostInEdition(null);
  };

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
            userRealmId={userRealmId}
            onReactionChange={onReactionChange}
            canInteract={
              roles.includes("organizer") || roles.includes("participant")
            }
            onDelete={onDelete}
            replyHrefFormatter={(postId) =>
              `/feed/event/${eventId}/post/${postId}`
            }
            canReply
            postInEdition={postInEdition?.postId ?? null}
            innerEditMode
            onEdit={onEdit}
            onEditModeChange={(postId, content, editMode) => {
              if (!editMode) {
                setPostInEdition(null);
                return;
              }
              setPostInEdition({ postId, content });
            }}
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
