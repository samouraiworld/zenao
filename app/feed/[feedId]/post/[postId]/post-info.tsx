"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { Suspense, useState } from "react";
import { userInfoOptions } from "@/lib/queries/user";
import { feedPost } from "@/lib/queries/social-feed";
import { OrgType } from "@/lib/organization";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";
import { StandardPostCard } from "@/components/social-feed/cards/standard-post-card";
import { PollPost } from "@/components/social-feed/polls/poll-post";
import CommentsList from "@/components/social-feed/lists/comments-list";
import Heading from "@/components/widgets/texts/heading";
import { parsePollUri } from "@/lib/multiaddr";
import { communityUserRoles } from "@/lib/queries/community";
import { eventUserRoles } from "@/lib/queries/event-users";

interface PostInfoProps {
  orgType: OrgType;
  orgId: string;
  postId: string;
}

export default function PostInfo({ orgType, orgId, postId }: PostInfoProps) {
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  // TODO Make it dependent on orgType
  const communityRolesQuery = useSuspenseQuery(
    communityUserRoles(orgId, userRealmId),
  );
  const eventRolesQuery = useSuspenseQuery(eventUserRoles(orgId, userRealmId));

  // const roles =
  //   orgType === "community" ? communityRolesQuery.data stat: eventRolesQuery.data;
  // const { data: post } = useSuspenseQuery(feedPost(postId, userRealmId || ""));

  const [editMode, setEditMode] = useState(false);

  const pkgPath =
    orgType === "community"
      ? `gno.land/r/zenao/communities/c${orgId}`
      : `gno.land/r/zenao/events/e${orgId}`;

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
              orgType === "community" ?
                roles.includes("administrator") || roles.includes("member");
              : roles.includes("organizer") || roles.includes("participant");
            }
            onReactionChange={async (icon) =>
              await onReactionChange(postId, icon)
            }
            editMode={editMode}
            innerEditForm
            onEditModeChange={setEditMode}
            onDelete={async (parentId) => {
              await onDelete(postId, parentId);
              router.push(
                orgType === "community"
                  ? `/community/${orgId}`
                  : `/event/${orgId}`,
              );
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
              router.push(
                orgType === "community"
                  ? `/community/${orgId}`
                  : `/event/${orgId}`,
              );
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
        {/* <PostCommentForm
          communityId={communityId}
          parentId={post.post.localPostId}
          userRoles={roles}
          form={form}
        /> */}

        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <CommentsList
              orgType={orgType}
              orgId={orgId}
              parentId={post.post.localPostId.toString()}
              feedId={feedId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
