"use client";

import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import EmptyList from "@/components/widgets/lists/empty-list";
import { PostCardSkeleton } from "@/components/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/social-feed/standard-post-card";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { PollPost } from "@/components/social-feed/poll-post";
import { parsePollUri } from "@/lib/multiaddr";
import { derivePkgAddr } from "@/lib/gno";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { isPollPost, isStandardPost, SocialFeedPost } from "@/lib/social-feed";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";

type CommunityPostsProps = {
  communityId: string;
};

function CommunityPosts({ communityId }: CommunityPostsProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const pkgPath = `gno.land/r/zenao/communities/c${communityId}`;
  const feedId = `${derivePkgAddr(pkgPath)}:main`;

  const {
    data: postsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(feedId, DEFAULT_FEED_POSTS_LIMIT, "", userAddress || ""),
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

  const onEdit = async (values: FeedPostFormSchemaType) => {
    try {
      if (values.kind === "POLL") {
        throw new Error("invalid kind");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid token");
      }
      // Community post edit
    } catch (error) {
      captureException(error);
    }
  };

  const onReactionChange = async (_: string) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing token");
      }
      // React
    } catch (error) {
      console.error("error", error);
    }
  };

  return (
    <div className="space-y-8">
      {posts.length === 0 ? (
        <EmptyList
          title={t("no-posts-title")}
          description={t("no-posts-description")}
        />
      ) : (
        posts.map((post) => {
          switch (post.postType) {
            case "standard":
              return (
                <Suspense
                  key={post.data.post.localPostId}
                  fallback={<PostCardSkeleton />}
                >
                  <StandardPostCard
                    post={post.data}
                    onReactionChange={onReactionChange}
                    onEdit={onEdit}
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
                    userAddress={userAddress}
                    pollId={pollId}
                    pollPost={post.data}
                  />
                </Suspense>
              );

            case "unknown":
              return null;
          }
        })
      )}

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
    </div>
  );
}

export default CommunityPosts;
