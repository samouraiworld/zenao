"use client";

import { Suspense } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { PostCardSkeleton } from "@/components/loader/social-feed/post-card-skeleton";
import { FeedPostFormSchemaType } from "@/components/form/types";
import { StandardPostForm } from "@/components/form/social-feed/standard-post-form";

function PostCommentForm({
  eventId,
  form,
}: {
  eventId: string;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  return (
    <div className="flex justify-center w-full transition-all duration-300 bg-secondary/80">
      <div className="w-full">
        <StandardPostForm
          eventId={eventId}
          form={form}
          feedInputMode={"STANDARD_POST"}
          setFeedInputMode={() => {
            console.log("not available");
          }}
        />
      </div>
    </div>
  );
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

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      content: "",
      parentPostId: BigInt(0), // post.post.localPostId
      question: "",
      options: [{ text: "" }, { text: "" }],
      allowMultipleOptions: false,
      duration: {
        days: 1,
        hours: 0,
        minutes: 0,
      },
    },
  });

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
        eventId={eventId}
        // postId={post.post.localPostId.toString()}
        form={form}
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
