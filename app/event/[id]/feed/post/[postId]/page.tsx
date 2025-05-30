import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import PostInfo from "./post-info";
import { getQueryClient } from "@/lib/get-query-client";

type PageProps = {
  params: Promise<{ id: string; postId: string }>;
};

export default async function PostDetailsPage({ params }: PageProps) {
  const queryClient = getQueryClient();
  const { id: eventId, postId } = await params;

  // TODO Prefetch GetFeedPost
  // queryClient.fetchQuery(feedPost(eventId, postId, userAddress || ""));
  // TODO Prefetch profile post creator
  // queryClient.prefetchQuery(profileOptions, userAddress || "");
  // TODO Prefetch GetFeedPostChildren
  // queryClient.prefetchQuery(feedPostsChildren(
  //     postId,
  //     DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  //     "",
  //     userAddress || "",
  //   ));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostInfo eventId={eventId} postId={postId} />
    </HydrationBoundary>
  );
}
