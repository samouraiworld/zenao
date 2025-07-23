"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { mockSocialFeedPosts } from "./mock-posts";
import EmptyList from "@/components/widgets/lists/empty-list";
import { PostCardSkeleton } from "@/components/features/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/features/social-feed/standard-post-card";
// import { parsePollUri } from "@/lib/multiaddr";
// import { PollPost } from "@/components/features/social-feed/poll-post";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";

type CommunityPostsProps = {
  communityId: string;
};

function CommunityPosts({ communityId: _ }: CommunityPostsProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { data: _ua } = useSuspenseQuery(userAddressOptions(getToken, userId));

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
      // await editPost({
      //   content: values.content,
      //   eventId,
      //   tags: [],
      //   postId: post.post.localPostId.toString(10),
      //   token,
      //   userAddress: userAddress || "",
      // });
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
      // await reactPost({
      //   token,
      //   userAddress: userAddress || "",
      //   postId,
      //   icon,
      //   eventId,
      //   parentId: "",
      // });
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
              // const { pollId } = parsePollUri(post.data.post.post.value.uri);

              return (
                <Suspense
                  fallback={<PostCardSkeleton />}
                  key={post.data.post.localPostId}
                >
                  {/* <PollPost eventId="0" pollId={pollId} pollPost={post.data} /> */}
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
