"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "../features/social-feed/post-card-skeleton";
import { PollPost } from "../features/social-feed/poll-post";
import { StandardPostCard } from "@/components/features/social-feed/standard-post-card";
import { SocialFeedPost } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { FeedPostFormSchemaType } from "@/types/schemas";

export function PostsList({
  // eventId,
  posts,
  onEdit,
  onReactionChange,
  canReply,
  isEditing,
  isReacting,
}: {
  // eventId: string;
  onEdit?: (
    postId: string,
    values: FeedPostFormSchemaType,
  ) => void | Promise<void>;
  onReactionChange?: (postId: string, icon: string) => void | Promise<void>;
  posts: SocialFeedPost[];
  canReply?: boolean;
  isEditing?: boolean;
  isReacting?: boolean;
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
              canReply={canReply}
              isEditing={isEditing}
              isReacting={isReacting}
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
            {/* <PollPost eventId={eventId} pollId={pollId} pollPost={post.data} /> */}
          </Suspense>
        );

      case "unknown":
        return null;
    }
  });
}
