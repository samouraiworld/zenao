"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import React, { useMemo, useState } from "react";
import { userInfoOptions } from "@/lib/queries/user";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
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
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userInfo?.realmId),
  );

  const userRealmId = userInfo?.realmId || "";

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

  const posts = useMemo(() => {
    return postsPages.pages.flat();
  }, [postsPages]);

  const pinnedPosts = useMemo(
    () => posts.filter((_) => false),
    // () => posts.filter((post) => post.data.pinned), // TODO: add pinned field to posts
    [posts],
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

  const onPinToggle = async (_postId: string) => {
    console.log("Pin toggle clicked");
    // await onPinTogglePost(postId);
  };

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
          <>
            <PostsList
              posts={pinnedPosts}
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
              canPin={roles.includes("organizer")}
              onPinToggle={onPinToggle}
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
              canPin={roles.includes("organizer")}
              onPinToggle={onPinToggle}
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
          </>
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
