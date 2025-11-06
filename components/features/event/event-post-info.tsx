"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  isPollPost,
  isStandardPost,
  PollPostView,
  StandardPostView,
} from "@/lib/social-feed";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";
import { StandardPostCard } from "@/components/social-feed/cards/standard-post-card";
import { PollPost } from "@/components/social-feed/polls/poll-post";
import { parsePollUri } from "@/lib/multiaddr";
import { eventUserRoles } from "@/lib/queries/event-users";

interface EventPostInfoProps {
  post: StandardPostView | PollPostView;
  postId: string;
  eventId: string;
  userRealmId: string;
  editMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  onEdit: (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => Promise<void>;
  isEditing: boolean;
  onReactionChange: (postId: string, icon: string) => Promise<void>;
  isReacting: boolean;
  onDelete: (postId: string, parentId?: string) => Promise<void>;
  isDeleting: boolean;
}

export default function EventPostInfo({
  post,
  postId,
  editMode,
  onEditModeChange,
  userRealmId,
  eventId,
  onEdit,
  isEditing,
  onReactionChange,
  isReacting,
  onDelete,
  isDeleting,
}: EventPostInfoProps) {
  const router = useRouter();
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  if (isStandardPost(post)) {
    return (
      <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
        <StandardPostCard
          post={post}
          onReactionChange={async (icon) =>
            await onReactionChange(postId, icon)
          }
          editMode={editMode}
          innerEditForm
          onEditModeChange={onEditModeChange}
          onDelete={async (parentId) => {
            await onDelete(postId, parentId);
            router.push(`/event/${eventId}`);
          }}
          onEdit={async (values) => await onEdit(postId, values)}
          isDeleting={isDeleting}
          isReacting={isReacting}
          isEditing={isEditing}
          canInteract
          isOwner={roles.includes("organizer") || roles.includes("participant")}
        />
      </Suspense>
    );
  }

  if (isPollPost(post)) {
    return (
      <Suspense fallback={<PostCardSkeleton />} key={post.post.localPostId}>
        <PollPost
          userRealmId={userRealmId}
          pollId={parsePollUri(post.post.post.value.uri).pollId}
          pollPost={post}
          onReactionChange={async (icon) =>
            await onReactionChange(postId, icon)
          }
          onDelete={async (parentId) => {
            await onDelete(postId, parentId);
            router.push(`/event/${eventId}`);
          }}
          isDeleting={isDeleting}
          isReacting={isReacting}
          isOwner={roles.includes("organizer") || roles.includes("participant")}
          canInteract
        />
      </Suspense>
    );
  }

  return null;
}
