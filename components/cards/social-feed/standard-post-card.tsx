"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { FeedPostFormSchemaType } from "@/components/form/types";

export function StandardPostCard({
  eventId,
  post,
  form,
}: {
  eventId: string;
  post: StandardPostView;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

  const standardPost = post.post.post.value;

  return (
    <PostCardLayout
      eventId={eventId}
      post={post}
      createdBy={createdBy}
      onReply={() => {
        form.setValue("parentPost", {
          kind: "POLL",
          postId: post.post.localPostId,
          author: post.post.author,
        });
      }}
    >
      <MarkdownPreview markdownString={standardPost.content} />
    </PostCardLayout>
  );
}
