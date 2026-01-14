import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import PostInfo from "./post-info";
import { getQueryClient } from "@/lib/get-query-client";
import { OrgType } from "@/lib/organization";
import { ScreenContainer } from "@/components/layout/screen-container";
import { feedPost } from "@/lib/queries/social-feed";

interface PageProps {
  params: Promise<{ orgType: string; orgId: string; postId: string }>;
}

export default async function SocialFeedPostPage({ params }: PageProps) {
  const queryClient = getQueryClient();
  const { orgType, orgId, postId } = await params;

  if (orgType !== "community" && orgType !== "event") {
    notFound();
  }

  try {
    await queryClient.fetchQuery(feedPost(postId, ""));
  } catch (error) {
    console.error("Error fetching post:", error);
    notFound();
  }

  const feedId = `${orgType}:${orgId}:main`;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <PostInfo
          orgType={orgType as OrgType}
          orgId={orgId}
          postId={postId}
          feedId={feedId}
        />
      </ScreenContainer>
    </HydrationBoundary>
  );
}
