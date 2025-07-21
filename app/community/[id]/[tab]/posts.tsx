"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { mockSocialFeedPosts } from "./mock-posts";
import EmptyList from "@/components/widgets/lists/empty-list";
import { PostCardSkeleton } from "@/components/features/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/features/social-feed/standard-post-card";
import { parsePollUri } from "@/lib/multiaddr";
import { PollPost } from "@/components/features/social-feed/poll-post";

type CommunityPostsProps = {
  communityId: string;
};

function CommunityPosts({ communityId: _ }: CommunityPostsProps) {
  const t = useTranslations();
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
                  <StandardPostCard eventId="0" post={post.data} />
                </Suspense>
              );
            case "poll":
              const { pollId } = parsePollUri(post.data.post.post.value.uri);

              return (
                <Suspense
                  fallback={<PostCardSkeleton />}
                  key={post.data.post.localPostId}
                >
                  <PollPost eventId="0" pollId={pollId} pollPost={post.data} />
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
