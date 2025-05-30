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
}: {
  eventId: string;
  post: StandardPostView;
  canReply?: boolean;
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
        canReply={canReply}
      >
        <MarkdownPreview markdownString={standardPost.content} />
      </PostCardLayout>
      {/* {showReplies && (
        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <PostComments
              eventId={eventId}
              parentId={post.post.localPostId.toString()}
            />
          </Suspense>
        </div>
      )} */}
    </div>
  );
}
