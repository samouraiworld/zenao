import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";

interface PageProps {
  params: Promise<{ feedId: string; postId: string }>;
}

export default async function SocialFeedPostPage({ params }: PageProps) {
  const queryClient = getQueryClient();
  const { feedId, postId } = await params;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>{null}</HydrationBoundary>
  );
}
