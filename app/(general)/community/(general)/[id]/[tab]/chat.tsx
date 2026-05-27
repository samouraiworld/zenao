"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import EmptyList from "@/components/widgets/lists/empty-list";
import { userInfoOptions } from "@/lib/queries/user";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import { communityUserRoles } from "@/lib/queries/community";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { PostsList } from "@/components/social-feed/lists/posts-list";
import usePinPostHandler from "@/hooks/use-pin-post-handler";

type CommunityChatProps = {
  communityId: string;
};

function CommunityChat({ communityId }: CommunityChatProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";
  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, userProfileId),
  );

  const [postInEdition, setPostInEdition] = useState<{
    postId: string;
    content: string;
  } | null>(null);

  const feedId = `community:${communityId}:main`;

  const {
    data: postsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(feedId, DEFAULT_FEED_POSTS_LIMIT, "", userProfileId),
  );
  const posts = useMemo(() => postsPages.pages.flat(), [postsPages]);

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(
    "community",
    communityId,
    feedId,
  );
  const { onReactionChange, isReacting } = useFeedPostReactionHandler(
    "community",
    communityId,
    feedId,
  );
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(
    "community",
    communityId,
    feedId,
  );

  const { onPinChange, isPinning } = usePinPostHandler(
    "community",
    communityId,
    feedId,
  );

  const onEdit = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => {
    await onEditStandardPost(postId, values);
    setPostInEdition(null);
  };

  const onPinToggle = async (postId: string, pinned: boolean) => {
    await onPinChange(postId, pinned);
  };

  return (
    <div className="relative space-y-8">
      {posts.length === 0 ? (
        <EmptyList
          title={t("no-posts-title")}
          description={t("no-posts-description")}
        />
      ) : (
        <div className="space-y-4">
          <PostsList
            posts={posts}
            userId={userProfileId}
            onReactionChange={onReactionChange}
            canInteract={
              userRoles.includes("member") ||
              userRoles.includes("administrator")
            }
            onDelete={onDelete}
            postInEdition={postInEdition?.postId ?? null}
            onEditModeChange={(postId, content, editMode) => {
              if (!editMode) {
                setPostInEdition(null);
                return;
              }
              setPostInEdition({ postId, content });
            }}
            replyHrefFormatter={(postId) =>
              `/feed/community/${communityId}/post/${postId}`
            }
            canReply
            canPin={userRoles.includes("administrator")}
            onPinToggle={onPinToggle}
            innerEditMode
            onEdit={onEdit}
            isReacting={isReacting}
            isDeleting={isDeleting}
            isEditing={isEditing}
            isPinning={isPinning}
          />
        </div>
      )}

      <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={posts}
          noMoreLabel={""}
        />
      </div>
    </div>
  );
}

export default CommunityChat;
