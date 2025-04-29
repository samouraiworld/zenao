"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/common/markdown-preview/markdown-preview";

export function StandardPostCard({
  eventId,
  post,
}: {
  eventId: string;
  post: StandardPostView;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

  const standardPost = post.post.post.value;

  return (
    <PostCardLayout eventId={eventId} post={post} createdBy={createdBy}>
      <MarkdownPreview markdownString={standardPost.content} />
    </PostCardLayout>
  );
}
