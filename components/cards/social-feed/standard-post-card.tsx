"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { isStandardPost, StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { FeedPostFormSchemaType } from "@/components/form/types";
import { PostCardSkeleton } from "@/components/loader/social-feed/post-card-skeleton";
import {
  DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  feedPostsChildren,
} from "@/lib/queries/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { LoaderMoreButton } from "@/components/buttons/load-more-button";

function PostComment({
  eventId,
  comment,
}: {
  eventId: string;
  comment: StandardPostView;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(comment.post.author),
  );

  const standardPost = comment.post.post.value;

  return (
    <PostCardLayout
      key={comment.post.localPostId}
      eventId={eventId}
      post={comment}
      createdBy={createdBy}
    >
      <MarkdownPreview markdownString={standardPost.content} />
    </PostCardLayout>
  );
}

function PostComments({
  eventId,
  parentId,
}: {
  eventId: string;
  parentId: string;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const {
    data: commentsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPostsChildren(
      parentId,
      DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
      "",
      userAddress || "",
    ),
  );
  const comments = useMemo(() => {
    return commentsPages.pages.flat().filter((comment) => {
      return isStandardPost(comment);
    });
  }, [commentsPages]);

  return (
    <div className="space-y-1">
      {comments.map((comment) => {
        return (
          <PostComment
            key={comment.post.localPostId}
            eventId={eventId}
            comment={comment}
          />
        );
      })}
      <LoaderMoreButton
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        page={comments}
        noMoreLabel={""}
      />
    </div>
  );
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
        parentId={post.post.localPostId.toString()}
      >
        <MarkdownPreview markdownString={standardPost.content} />
      </PostCardLayout>
      {showReplies && (
        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <PostComments
              eventId={eventId}
              parentId={post.post.localPostId.toString()}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
