"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { mockSocialFeedPosts } from "./mock-posts";
import EmptyList from "@/components/widgets/lists/empty-list";
import { PostCardSkeleton } from "@/components/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/social-feed/standard-post-card";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { PollPost } from "@/components/social-feed/poll-post";
import { parsePollUri } from "@/lib/multiaddr";

type CommunityPostsProps = {
  communityId: string;
};

function CommunityPosts({ communityId: _ }: CommunityPostsProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
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
      {mockSocialFeedPosts.length === 0 ? (
        <EmptyList
          title={t("no-posts-title")}
          description={t("no-posts-description")}
        />
      ) : (
        mockSocialFeedPosts.map((post) => {
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

      {/* <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={posts}
          noMoreLabel={t("no-more-posts")}
        />
      </div> */}
    </div>
  );
}

export default CommunityPosts;
