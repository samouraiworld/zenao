"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "@/components/loader/social-feed/post-card-skeleton";
import { FeedPostFormSchemaType } from "@/components/form/types";

function PostCommentForm({
  postId,
  onSubmit,
}: {
  postId: string;
  onSubmit: (values: FeedPostFormSchemaType) => Promise<void>;
}) {
  void postId;
  void onSubmit;
  // return <PollPostForm />;

  return <div>Comment Form</div>;
}

export default function PostInfo({
  eventId,
  postId,
}: {
  eventId: string;
  postId: string;
}) {
  void eventId;
  void postId;

  const onSubmit = async (values: FeedPostFormSchemaType) => {
    console.log(values);
  };

  return (
    <div className="w-full flex flex-col gap-12">
      {/* {switch (post.postType) {
          case "standard":
            return (
              <Suspense
                key={post.data.post.localPostId}
                fallback={<PostCardSkeleton />}
              >
                <StandardPostCard
                  eventId={eventId}
                  post={post.data}
                  form={form}
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
                  eventId={eventId}
                  pollId={pollId}
                  pollPost={post.data}
                  form={form}
                />
              </Suspense>
            );

          case "unknown":
            return null;
        }} */}

      {/* TODO Form standard post commment */}
      <PostCommentForm
        // postId={post.post.localPostId.toString()}
        postId=""
        onSubmit={onSubmit}
      />

      {/* TODO Display comment */}
      <div className="pl-6">
        <Suspense fallback={<PostCardSkeleton />}>
          {/* <PostComments
              eventId={eventId}
              parentId={post.post.localPostId.toString()}
            /> */}
        </Suspense>
      </div>
    </div>
  );
}
