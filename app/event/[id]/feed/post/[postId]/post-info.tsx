"use client";

import { Suspense } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PostCardSkeleton } from "@/components/features/social-feed/post-card-skeleton";
import { userAddressOptions } from "@/lib/queries/user";
import { feedPost } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
// import { StandardPostCard } from "@/components/features/social-feed/standard-post-card";
// import { parsePollUri } from "@/lib/multiaddr";
import Heading from "@/components/widgets/texts/heading";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { useToast } from "@/app/hooks/use-toast";
import { captureException } from "@/lib/report";
import { FeedPostFormSchemaType } from "@/types/schemas";
// import { PollPost } from "@/components/features/social-feed/poll-post";
import { PostComments } from "@/components/features/social-feed/event-feed-form/post-comments";
import { StandardPostForm } from "@/components/features/social-feed/event-feed-form/standard-post-form";

function PostCommentForm({
  eventId,
  parentId,
  form,
}: {
  eventId: string;
  parentId: bigint;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const { toast } = useToast();
  const t = useTranslations("event-feed.standard-post-form");

  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { createStandardPost, isPending } = useCreateStandardPost();

  const onSubmit = async (values: FeedPostFormSchemaType) => {
    try {
      if (values.kind !== "STANDARD_POST") {
        throw new Error("invalid form");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await createStandardPost({
        eventId,
        content: values.content,
        parentId: parentId.toString(),
        token,
        userAddress: userAddress ?? "",
        tags: [],
      });

      toast({
        title: t("toast-post-creation-success"),
      });

      form.reset(
        { kind: "STANDARD_POST", content: "" },
        { keepDefaultValues: true },
      );
      form.reset(
        {
          options: [{ text: "" }, { text: "" }],
          allowMultipleOptions: false,
          duration: {
            days: 1,
            hours: 0,
            minutes: 0,
          },
        },
        { keepDefaultValues: true, keepValues: true },
      );
      form.reset(
        { kind: "STANDARD_POST", content: "" },
        { keepDefaultValues: true },
      );
      form.reset(
        {
          options: [{ text: "" }, { text: "" }],
          allowMultipleOptions: false,
          duration: {
            days: 1,
            hours: 0,
            minutes: 0,
          },
        },
        { keepDefaultValues: true, keepValues: true },
      );
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
    }
  };

  return (
    <div className="flex justify-center w-full transition-all duration-300 bg-secondary/80">
      <div className="w-full">
        <StandardPostForm
          form={form}
          feedInputMode={"STANDARD_POST"}
          setFeedInputMode={() => {
            console.log("not available");
          }}
          onSubmit={onSubmit}
          isLoading={isPending}
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
  // const router = useRouter();
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

  // TODO
  return (
    <div className="w-full flex flex-col gap-12">
      {/* {isStandardPost(post) && (
        <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
          <StandardPostCard
            // eventId={eventId}
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
      )} */}

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
