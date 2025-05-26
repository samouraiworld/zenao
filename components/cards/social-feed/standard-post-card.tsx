"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { Suspense, useState } from "react";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { FeedPostFormSchemaType } from "@/components/form/types";
import { PostCardSkeleton } from "@/components/loader/social-feed/post-card-skeleton";

function PostComments({ parentId }: { parentId: string }) {
  return <p>{parentId}</p>;
}

export function StandardPostCard({
  eventId,
  post,
  form,
}: {
  eventId: string;
  post: StandardPostView;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const [showReplies, setShowReplies] = useState(false);
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
        onReply={() => {
          form.setValue("parentPost", {
            kind: "STANDARD_POST",
            postId: post.post.localPostId,
            author: post.post.author,
          });
        }}
        onDisplayReplies={() => {
          setShowReplies((prev) => !prev);
        }}
      >
        <MarkdownPreview markdownString={standardPost.content} />
      </PostCardLayout>
      {showReplies && (
        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <PostComments parentId={post.post.localPostId.toString()} />
            <PostCardLayout eventId={eventId} post={post} createdBy={createdBy}>
              {/* TODO Replace by real replies */}
              <MarkdownPreview markdownString={standardPost.content} />
            </PostCardLayout>
          </Suspense>
        </div>
      )}
    </div>
  );
}
