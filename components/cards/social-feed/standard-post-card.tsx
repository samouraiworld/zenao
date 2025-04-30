"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { derivePkgAddr } from "@/lib/gno";

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
  const feedSlug = `${derivePkgAddr(`gno.land/r/zenao/events/e${eventId}`)}:main`;

  return (
    <PostCardLayout
      eventId={eventId}
      post={post}
      createdBy={createdBy}
      gnowebHref={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/social_feed:${feedSlug}`}
    >
      <MarkdownPreview markdownString={standardPost.content} />
    </PostCardLayout>
  );
}
