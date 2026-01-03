"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { communityUserRoles } from "@/lib/queries/community";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import {
  isPollPost,
  isStandardPost,
  PollPostView,
  StandardPostView,
} from "@/lib/social-feed";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";
import { StandardPostCard } from "@/components/social-feed/cards/standard-post-card";
import { PollPost } from "@/components/social-feed/polls/poll-post";
import { parsePollUri } from "@/lib/multiaddr";

interface CommunityPostInfoProps {
  post: StandardPostView | PollPostView;
  postId: string;
  communityId: string;
  userId: string;
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
  pinned?: boolean;
  onPinToggle?: () => void | Promise<void>;
}

export default function CommunityPostInfo({
  post,
  postId,
  editMode,
  onEditModeChange,
  userId,
  communityId,
  onEdit,
  isEditing,
  onReactionChange,
  isReacting,
  onDelete,
  isDeleting,
  pinned,
  onPinToggle,
}: CommunityPostInfoProps) {
  const router = useRouter();
  const { data: roles } = useSuspenseQuery(
    communityUserRoles(communityId, userId),
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
            router.push(`/community/${communityId}`);
          }}
          onEdit={async (values) => await onEdit(postId, values)}
          isDeleting={isDeleting}
          isReacting={isReacting}
          isEditing={isEditing}
          canPin={roles.includes("administrator")}
          pinned={pinned}
          onPinToggle={onPinToggle}
          canInteract
          isOwner={roles.includes("administrator") || roles.includes("member")}
        />
      </Suspense>
    );
  }

  if (isPollPost(post)) {
    return (
      <Suspense fallback={<PostCardSkeleton />} key={post.post.localPostId}>
        <PollPost
          userId={userId}
          pollId={parsePollUri(post.post.post.value.uri).pollId}
          pollPost={post}
          onReactionChange={async (icon) =>
            await onReactionChange(postId, icon)
          }
          onDelete={async (parentId) => {
            await onDelete(postId, parentId);
            router.push(`/community/${communityId}`);
          }}
          isDeleting={isDeleting}
          isReacting={isReacting}
          isOwner={roles.includes("administrator") || roles.includes("member")}
          canInteract
        />
      </Suspense>
    );
  }

  return null;
}
