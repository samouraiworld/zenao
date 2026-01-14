"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "../cards/post-card-skeleton";
import { PollPost } from "../polls/poll-post";
import { PollPostView } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";

export function PollsList({
  polls,
  userId,
  onDelete,
  onReactionChange,
  isDeleting,
  isReacting,
  canInteract,
  canReply,
  replyHrefFormatter,
}: {
  polls: PollPostView[];
  userId: string | null;
  isReacting?: boolean;
  isDeleting?: boolean;
  canReply?: boolean;
  canInteract?: boolean;
  replyHrefFormatter?: (postId: bigint) => string;
  onReactionChange?: (postId: string, icon: string) => void | Promise<void>;
  onDelete?: (postId: string, parentId?: string) => void | Promise<void>;
}) {
  return polls.map((pollPost) => {
    const postId = pollPost.post.localPostId.toString(10);
    const { pollId } = parsePollUri(pollPost.post.post.value.uri);

    return (
      <Suspense fallback={<PostCardSkeleton />} key={pollId}>
        <PollPost
          userId={userId}
          pollId={pollId}
          pollPost={pollPost}
          onDelete={async (parentId) => {
            await onDelete?.(postId, parentId);
          }}
          onReactionChange={async (icon) =>
            await onReactionChange?.(postId, icon)
          }
          isOwner={pollPost.post.author === userId}
          replyHref={replyHrefFormatter?.(pollPost.post.localPostId)}
          canReply={canReply}
          canInteract={canInteract}
          isDeleting={isDeleting}
          isReacting={isReacting}
        />
      </Suspense>
    );
  });
}
