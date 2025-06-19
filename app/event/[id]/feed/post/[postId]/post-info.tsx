"use client";

import { Suspense } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PostCardSkeleton } from "@/components/loader/social-feed/post-card-skeleton";
import { FeedPostFormSchemaType } from "@/components/form/types";
import { StandardPostForm } from "@/components/form/social-feed/standard-post-form";
import { userAddressOptions } from "@/lib/queries/user";
import { feedPost } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { parsePollUri } from "@/lib/multiaddr";
import { PollPost } from "@/components/widgets/poll-post";
import Heading from "@/components/texts/heading";
import { PostComments } from "@/components/form/social-feed/post-comments";

function PostCommentForm({
  eventId,
  parentId,
  form,
}: {
  eventId: string;
  parentId: bigint;
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
          onSuccess={() => {
            form.reset(
              { kind: "STANDARD_POST", parentPostId: parentId, content: "" },
              { keepValues: false },
            );
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
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { data: post } = useSuspenseQuery(feedPost(postId, userAddress || ""));

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      kind: "STANDARD_POST",
      content: "",
      parentPostId: post.post?.localPostId,
    },
  });

  if (!isStandardPost(post) && !isPollPost(post)) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-12">
      {isStandardPost(post) && (
        <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
          <StandardPostCard
            eventId={eventId}
            post={post}
            onDeleteSuccess={() => router.push(`/event/${eventId}/feed`)}
          />
        </Suspense>
      )}
      {isPollPost(post) && (
        <Suspense fallback={<PostCardSkeleton />} key={post.post.localPostId}>
          <PollPost
            eventId={eventId}
            pollId={parsePollUri(post.post.post.value.uri).pollId}
            pollPost={post}
          />
        </Suspense>
      )}

      <div className="flex flex-col gap-4">
        <Heading level={2}>Comments ({post.childrenCount})</Heading>
        <PostCommentForm
          eventId={eventId}
          parentId={post.post.localPostId}
          form={form}
        />

        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <PostComments
              eventId={eventId}
              parentId={post.post.localPostId.toString()}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
