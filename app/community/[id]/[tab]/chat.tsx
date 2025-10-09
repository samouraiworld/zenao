"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import EmptyList from "@/components/widgets/lists/empty-list";
import { userInfoOptions } from "@/lib/queries/user";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import FeedPostForm from "@/components/social-feed/feed-post-form";
import { PostsList } from "@/components/social-feed/posts-list";
import useEventPostEditHandler from "@/hooks/use-event-post-edit-handler";
import useEventPostReactionHandler from "@/hooks/use-event-post-reaction-handler";
import useEventPostDeleteHandler from "@/hooks/use-event-post-delete-handler";
import { communityUserRoles } from "@/lib/queries/community";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { usePwaContext } from "@/components/providers/pwa-state-provider";

type CommunityChatProps = {
  communityId: string;
};

function CommunityChat({ communityId }: CommunityChatProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, userRealmId),
  );

  const { onDisplayBottomBarChange } = usePwaContext();

  const [postInEdition, setPostInEdition] = useState<{
    postId: string;
    content: string;
  } | null>(null);

  const pkgPath = `gno.land/r/zenao/communities/c${communityId}`;
  const feedId = `${pkgPath}:main`;

  const {
    data: postsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(feedId, DEFAULT_FEED_POSTS_LIMIT, "", userRealmId),
  );
  const posts = useMemo(
    () =>
      postsPages.pages.flat().map<SocialFeedPost>((post) => {
        if (isPollPost(post)) {
          return {
            postType: "poll",
            data: post,
          };
        } else if (isStandardPost(post)) {
          return {
            postType: "standard",
            data: post,
          };
        }
        return {
          postType: "unknown",
          data: post,
        };
      }),
    [postsPages],
  );

  const { onEditStandardPost, isEditing } = useEventPostEditHandler(feedId);
  const { onReactionChange, isReacting } = useEventPostReactionHandler(feedId);
  const { onDelete, isDeleting } = useEventPostDeleteHandler(feedId);

  const onEdit = async (postId: string, values: FeedPostFormSchemaType) => {
    await onEditStandardPost(postId, values);
    setPostInEdition(null);
  };

  useEffect(() => {
    if (userRoles.includes("member") || userRoles.includes("administrator")) {
      onDisplayBottomBarChange(false);
    }

    return () => {
      onDisplayBottomBarChange(true);
    };
  }, [onDisplayBottomBarChange, userRoles]);

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
            userRealmId={userRealmId}
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
            isReacting={isReacting}
            isDeleting={isDeleting}
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

      {(userRoles.includes("member") ||
        userRoles.includes("administrator")) && (
        <FeedPostForm
          orgId={communityId}
          orgType="community"
          editMode={!!postInEdition}
          postInEdition={postInEdition}
          onEdit={onEdit}
          onCancelEdit={() => setPostInEdition(null)}
          isEditing={isEditing}
        />
      )}
    </div>
  );
}

export default CommunityChat;
