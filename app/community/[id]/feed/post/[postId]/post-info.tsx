"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { PollPost } from "@/components/social-feed/poll-post";
import { PostCardSkeleton } from "@/components/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/social-feed/standard-post-card";
import Heading from "@/components/widgets/texts/heading";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import { useToast } from "@/hooks/use-toast";
import { derivePkgAddr } from "@/lib/gno";
import { parsePollUri } from "@/lib/multiaddr";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { feedPost } from "@/lib/queries/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { StandardPostForm } from "@/components/social-feed/standard-post-form";
import { PostComments } from "@/components/social-feed/post-comments";
import { CommunityUserRole, communityUserRoles } from "@/lib/queries/community";

function PostCommentForm({
  communityId,
  parentId,
  userRoles,
  form,
}: {
  communityId: string;
  parentId: bigint;
  userRoles: CommunityUserRole[];
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const { toast } = useToast();
  const t = useTranslations("social-feed.standard-post-form");

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
        orgType: "community",
        orgId: communityId,
        content: values.content,
        parentId: parentId.toString(),
        token,
        userAddress: userAddress ?? "",
        tags: [],
      });

      toast({
        title: t("toast-post-creation-success"),
      });

      form.resetField("content", { defaultValue: "" });
      form.resetField("parentPostId");
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
    }
  };

  return (
    <>
      <SignedOut>
        <div className="flex justify-center w-full">
          <div className="w-full">
            You must be a participant to submit a comment.
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        {!userRoles.includes("administrator") &&
        !userRoles.includes("member") ? (
          <div className="flex justify-center w-full">
            <div className="w-full">
              You must be a participant to submit a comment.
            </div>
          </div>
        ) : (
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
        )}
      </SignedIn>
    </>
  );
}

export default function PostInfo({
  communityId,
  postId,
}: {
  communityId: string;
  postId: string;
}) {
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress),
  );
  const { data: post } = useSuspenseQuery(feedPost(postId, userAddress || ""));

  const [editMode, setEditMode] = useState(false);

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      kind: "STANDARD_POST",
      content: "",
      parentPostId: post.post?.localPostId,
    },
  });

  const pkgPath = `gno.land/r/zenao/communities/c${communityId}`;
  const feedId = `${derivePkgAddr(pkgPath)}:main`;

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(feedId);
  const { onReactionChange, isReacting } = useFeedPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(feedId);

  const onEdit = async (postId: string, values: FeedPostFormSchemaType) => {
    await onEditStandardPost(postId, values);
    setEditMode(false);
  };

  if (!isStandardPost(post) && !isPollPost(post)) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-12">
      {isStandardPost(post) && (
        <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
          <StandardPostCard
            post={post}
            isOwner={
              roles.includes("administrator") || roles.includes("member")
            }
            onReactionChange={async (icon) =>
              await onReactionChange(postId, icon)
            }
            editMode={editMode}
            innerEditForm
            onEditModeChange={setEditMode}
            onDelete={async (parentId) => {
              await onDelete(postId, parentId);
              router.push(`/community/${communityId}`);
            }}
            onEdit={async (values) => await onEdit(postId, values)}
            isDeleting={isDeleting}
            isReacting={isReacting}
            isEditing={isEditing}
            canInteract
          />
        </Suspense>
      )}
      {isPollPost(post) && (
        <Suspense fallback={<PostCardSkeleton />} key={post.post.localPostId}>
          <PollPost
            userAddress={userAddress}
            pollId={parsePollUri(post.post.post.value.uri).pollId}
            pollPost={post}
            onReactionChange={async (icon) =>
              await onReactionChange(postId, icon)
            }
            onDelete={async (parentId) => {
              await onDelete(postId, parentId);
              router.push(`/community/${communityId}`);
            }}
            isDeleting={isDeleting}
            isReacting={isReacting}
            isOwner={
              roles.includes("administrator") || roles.includes("member")
            }
            canInteract
          />
        </Suspense>
      )}

      <div className="flex flex-col gap-4">
        <Heading level={2}>Comments ({post.childrenCount})</Heading>
        <PostCommentForm
          communityId={communityId}
          parentId={post.post.localPostId}
          userRoles={roles}
          form={form}
        />

        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <PostComments
              orgId={communityId}
              parentId={post.post.localPostId.toString()}
              feedId={feedId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
