"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { userInfoOptions } from "@/lib/queries/user";
import { feedPost } from "@/lib/queries/social-feed";
import { OrgType } from "@/lib/organization";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";
import CommentsList from "@/components/social-feed/lists/comments-list";
import Heading from "@/components/widgets/texts/heading";
import CommunityPostInfo from "@/components/features/community/post-info-community";
import EventPostInfo from "@/components/features/event/post-info-event";

interface PostInfoProps {
  orgType: OrgType;
  orgId: string;
  feedId: string;
  postId: string;
}

export default function PostInfo({
  orgType,
  orgId,
  postId,
  feedId,
}: PostInfoProps) {
  const { userId, getToken } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const { data: post } = useSuspenseQuery(feedPost(postId, userRealmId || ""));

  const [editMode, setEditMode] = useState(false);

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(feedId);
  const { onReactionChange, isReacting } = useFeedPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(feedId);

  const onEdit = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => {
    await onEditStandardPost(postId, values);
    setEditMode(false);
  };

  if (!isStandardPost(post) && !isPollPost(post)) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-12">
      {orgType === "community" && (
        <CommunityPostInfo
          post={post}
          postId={postId}
          communityId={orgId}
          userRealmId={userRealmId}
          editMode={editMode}
          onEditModeChange={setEditMode}
          onEdit={onEdit}
          isEditing={isEditing}
          onReactionChange={onReactionChange}
          isReacting={isReacting}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      )}
      {orgType === "event" && (
        <EventPostInfo
          post={post}
          postId={postId}
          eventId={orgId}
          userRealmId={userRealmId}
          editMode={editMode}
          onEditModeChange={setEditMode}
          onEdit={onEdit}
          isEditing={isEditing}
          onReactionChange={onReactionChange}
          isReacting={isReacting}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      )}

      <div className="flex flex-col gap-4">
        <Heading level={2}>Comments ({post.childrenCount})</Heading>
        {/* <PostCommentForm
          communityId={communityId}
          parentId={post.post.localPostId}
          userRoles={roles}
          form={form}
        /> */}

        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <CommentsList
              orgType={orgType}
              orgId={orgId}
              parentId={post.post.localPostId.toString()}
              feedId={feedId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
