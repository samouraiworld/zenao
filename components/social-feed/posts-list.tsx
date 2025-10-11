"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "./post-card-skeleton";
import { PollPost } from "./poll-post";
import { StandardPostCard } from "@/components/social-feed/standard-post-card";
import { SocialFeedPost } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { FeedPostFormSchemaType } from "@/types/schemas";

export function PostsList({
  userRealmId,
  posts,
  postInEdition,
  onEditModeChange,
  onReactionChange,
  onDelete,
  replyHrefFormatter,
  canReply,
  canInteract,
  onEdit,
  isEditing,
  isReacting,
  isDeleting,
}: {
  userRealmId: string;
  postInEdition: string | null;
  onEditModeChange?: (
    postId: string,
    content: string,
    editMode: boolean,
  ) => void | Promise<void>;
  onReactionChange?: (postId: string, icon: string) => void | Promise<void>;
  onDelete?: (postId: string, parentId?: string) => void | Promise<void>;
  posts: SocialFeedPost[];
  replyHrefFormatter?: (postId: bigint) => string;
  canReply?: boolean;
  canInteract?: boolean;
  innerEditMode?: boolean;
  onEdit?: (
    postId: string,
    values: FeedPostFormSchemaType,
  ) => void | Promise<void>;
  isEditing?: boolean;
  isReacting?: boolean;
  isDeleting?: boolean;
}) {
  return posts.map((post) => {
    const postId = post.data.post!.localPostId.toString(10);

    switch (post.postType) {
      case "standard":
        return (
          <Suspense
            key={post.data.post.localPostId}
            fallback={<PostCardSkeleton />}
          >
            <StandardPostCard
              post={post.data}
              onReactionChange={async (icon) =>
                await onReactionChange?.(postId, icon)
              }
              onDelete={async (parentId) => {
                await onDelete?.(postId, parentId);
              }}
              isOwner={post.data.post.author === userRealmId}
              canReply={canReply}
              replyHref={replyHrefFormatter?.(post.data.post.localPostId)}
              canInteract={canInteract}
              editMode={postInEdition === postId}
              onEditModeChange={async (editMode) =>
                await onEditModeChange?.(
                  postId,
                  post.data.post.post.value.content,
                  editMode,
                )
              }
              innerEditForm
              onEdit={async (values) => await onEdit?.(postId, values)}
              isEditing={isEditing}
              isReacting={isReacting}
              isDeleting={isDeleting}
            />
          </Suspense>
        );
      case "poll":
        const { pollId } = parsePollUri(post.data.post.post.value.uri);

        return (
          <Suspense
            fallback={<PostCardSkeleton />}
            key={post.data.post.localPostId}
          >
            <PollPost
              userRealmId={userRealmId}
              pollId={pollId}
              pollPost={post.data}
              onDelete={async (parentId) => {
                await onDelete?.(postId, parentId);
              }}
              onReactionChange={async (icon) =>
                await onReactionChange?.(postId, icon)
              }
              isOwner={post.data.post.author === userRealmId}
              replyHref={replyHrefFormatter?.(post.data.post.localPostId)}
              canReply={canReply}
              canInteract={canInteract}
              isDeleting={isDeleting}
              isReacting={isReacting}
            />
          </Suspense>
        );

      case "unknown":
        return null;
    }
  });
}
