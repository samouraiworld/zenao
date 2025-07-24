"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "./post-card-skeleton";
import { PollPost } from "./poll-post";
import { StandardPostCard } from "@/components/social-feed/standard-post-card";
import { SocialFeedPost } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { FeedPostFormSchemaType } from "@/types/schemas";

export function PostsList({
  userAddress,
  posts,
  onEdit,
  onReactionChange,
  onDelete,
  replyHrefFormatter,
  canReply,
  canInteract,
  isEditing,
  isReacting,
  isDeleting,
}: {
  userAddress: string | null;
  onEdit?: (
    postId: string,
    values: FeedPostFormSchemaType,
  ) => void | Promise<void>;
  onReactionChange?: (postId: string, icon: string) => void | Promise<void>;
  onDelete?: (postId: string, parentId?: string) => void | Promise<void>;
  posts: SocialFeedPost[];
  replyHrefFormatter?: (postId: bigint) => string;
  canReply?: boolean;
  canInteract?: boolean;
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
              onEdit={async (values) => await onEdit?.(postId, values)}
              onReactionChange={async (icon) =>
                await onReactionChange?.(postId, icon)
              }
              onDelete={async (parentId) => {
                await onDelete?.(postId, parentId);
              }}
              isOwner={post.data.post.author === userAddress}
              canReply={canReply}
              replyHref={replyHrefFormatter?.(post.data.post.localPostId)}
              canInteract={canInteract}
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
              userAddress={userAddress}
              pollId={pollId}
              pollPost={post.data}
              onDelete={async (parentId) => {
                await onDelete?.(postId, parentId);
              }}
              onReactionChange={async (icon) =>
                await onReactionChange?.(postId, icon)
              }
              isOwner={post.data.post.author === userAddress}
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
