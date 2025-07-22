"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { userAddressOptions } from "@/lib/queries/user";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { PostsList } from "@/components/social-feed/posts-list";
import { useEditStandardPost, useReactPost } from "@/lib/mutations/social-feed";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { captureException } from "@/lib/report";

type EventFeedProps = {
  eventId: string;
};

function EventFeed({ eventId }: EventFeedProps) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { editPost, isPending: isEditing } = useEditStandardPost();
  const { reactPost, isPending: isReacting } = useReactPost();

  const t = useTranslations("");
  // Event's social feed posts
  const {
    data: postsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(eventId, DEFAULT_FEED_POSTS_LIMIT, "", userAddress || ""),
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

  const onEditStandardPost = async (
    postId: string,
    values: FeedPostFormSchemaType,
  ) => {
    try {
      if (values.kind === "POLL") {
        throw new Error("invalid kind");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid token");
      }
      await editPost({
        content: values.content,
        eventId,
        tags: [],
        postId,
        token,
        userAddress: userAddress || "",
      });
    } catch (error) {
      captureException(error);
    }
  };

  const onReactionChange = async (postId: string, icon: string) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing token");
      }
      await reactPost({
        token,
        userAddress: userAddress || "",
        postId,
        icon,
        eventId,
        parentId: "",
      });
    } catch (error) {
      console.error("error", error);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {!posts.length ? (
          <EmptyList
            title={t("no-posts-title")}
            description={t("no-posts-description")}
          />
        ) : (
          <PostsList
            posts={posts}
            onEdit={onEditStandardPost}
            onReactionChange={onReactionChange}
            isEditing={isEditing}
            isReacting={isReacting}
          />
        )}
      </div>
      <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={posts}
          noMoreLabel={t("no-more-posts")}
        />
      </div>
    </>
  );
}

export default EventFeed;
