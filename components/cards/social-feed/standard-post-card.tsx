"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/common/markdown-preview";

export function StandardPostCard({
  eventId,
  post,
  canReply,
  onDeleteSuccess,
}: {
  eventId: string;
  post: StandardPostView;
  canReply?: boolean;
  onDeleteSuccess?: () => void;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

  const standardPost = post.post.post.value;

  return (
    <div className="flex flex-col gap-1">
      <PostCardLayout
        eventId={eventId}
        post={post}
        createdBy={createdBy}
        gnowebHref={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/social_feed:post/${post.post.localPostId.toString(32).padStart(7, "0")}`}
        canReply={canReply}
        onDeleteSuccess={onDeleteSuccess}
      >
        <MarkdownPreview markdownString={standardPost.content} />
      </PostCardLayout>
    </div>
  );
}
