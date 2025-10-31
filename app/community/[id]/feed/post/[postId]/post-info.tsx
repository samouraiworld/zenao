"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import { StandardPostCard } from "@/components/social-feed/cards/standard-post-card";
import Heading from "@/components/widgets/texts/heading";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import { parsePollUri } from "@/lib/multiaddr";
import { feedPost } from "@/lib/queries/social-feed";
import { userInfoOptions } from "@/lib/queries/user";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { communityUserRoles } from "@/lib/queries/community";
import { PollPost } from "@/components/social-feed/polls/poll-post";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";
import CommentsList from "@/components/social-feed/lists/comments-list";

const PostCommentFormNoSSR = dynamic(() => import("./post-comment-form"), {
  ssr: false,
});

export default function PostInfo({
  communityId,
  postId,
}: {
  communityId: string;
  postId: string;
}) {
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { data: roles } = useSuspenseQuery(
    communityUserRoles(communityId, userRealmId),
  );
  const { data: post } = useSuspenseQuery(feedPost(postId, userRealmId || ""));

  const [editMode, setEditMode] = useState(false);

  const form = useForm<SocialFeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      kind: "STANDARD_POST",
      content: "",
      parentPostId: post.post?.localPostId,
    },
  });

  const pkgPath = `gno.land/r/zenao/communities/c${communityId}`;
  const feedId = `${pkgPath}:main`;

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(feedId);
  const { onReactionChange, isReacting } = useFeedPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(feedId);

  const onEdit = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => {
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
            userRealmId={userRealmId}
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
        <PostCommentFormNoSSR
          communityId={communityId}
          parentId={post.post.localPostId}
          userRoles={roles}
          form={form}
        />

        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <CommentsList
              orgType="community"
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
