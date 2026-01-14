"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "../cards/post-card-skeleton";
import { PollPost } from "../polls/poll-post";
import { StandardPostCard } from "@/components/social-feed/cards/standard-post-card";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";

export function PostsList({
  userId,
  posts,
  postInEdition,
  onEditModeChange,
  onReactionChange,
  onDelete,
  replyHrefFormatter,
  canReply,
  canInteract,
  canPin,
  onPinToggle,
  onEdit,
  isEditing,
  isReacting,
  isDeleting,
  isPinning,
}: {
  userId: string | null;
  postInEdition: string | null;
  onEditModeChange?: (
    postId: string,
    content: string,
    editMode: boolean,
  ) => void | Promise<void>;
  onReactionChange?: (postId: string, icon: string) => void | Promise<void>;
  onDelete?: (postId: string, parentId?: string) => void | Promise<void>;
  posts: PostView[];
  replyHrefFormatter?: (postId: bigint) => string;
  canReply?: boolean;
  canInteract?: boolean;
  canPin?: boolean;
  onPinToggle?: (postId: string, pinned: boolean) => void | Promise<void>;
  innerEditMode?: boolean;
  onEdit?: (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => void | Promise<void>;
  isEditing?: boolean;
  isReacting?: boolean;
  isDeleting?: boolean;
  isPinning?: boolean;
}) {
  return posts.map((post) => {
    const postId = post.post!.localPostId.toString(10);

    if (isStandardPost(post)) {
      return (
        <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
          <StandardPostCard
            post={post}
            onReactionChange={async (icon) =>
              await onReactionChange?.(postId, icon)
            }
            onDelete={async (parentId) => {
              await onDelete?.(postId, parentId);
            }}
            isOwner={post.post.author === userId}
            canReply={canReply}
            replyHref={replyHrefFormatter?.(post.post.localPostId)}
            canInteract={canInteract}
            canPin={canPin}
            pinned={post.post.pinned}
            onPinToggle={async () => {
              await onPinToggle?.(postId, !post.post.pinned);
            }}
            editMode={postInEdition === postId}
            onEditModeChange={async (editMode) =>
              await onEditModeChange?.(
                postId,
                post.post.post.value.content,
                editMode,
              )
            }
            innerEditForm
            onEdit={async (values) => await onEdit?.(postId, values)}
            isEditing={isEditing}
            isReacting={isReacting}
            isDeleting={isDeleting}
            isPinning={isPinning}
          />
        </Suspense>
      );
    } else if (isPollPost(post)) {
      const { pollId } = parsePollUri(post.post.post.value.uri);

      return (
        <Suspense fallback={<PostCardSkeleton />} key={post.post.localPostId}>
          <PollPost
            userId={userId}
            pollId={pollId}
            pollPost={post}
            onDelete={async (parentId) => {
              await onDelete?.(postId, parentId);
            }}
            onReactionChange={async (icon) =>
              await onReactionChange?.(postId, icon)
            }
            isOwner={post.post.author === userId}
            replyHref={replyHrefFormatter?.(post.post.localPostId)}
            canReply={canReply}
            canInteract={canInteract}
            isDeleting={isDeleting}
            isReacting={isReacting}
          />
        </Suspense>
      );
    } else {
      return null;
    }
  });
}
