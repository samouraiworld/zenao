import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import PostInfo from "./post-info";
import { getQueryClient } from "@/lib/get-query-client";
import { OrgType } from "@/lib/organization";
import { ScreenContainer } from "@/components/layout/screen-container";
import { feedPost } from "@/lib/queries/social-feed";
import { eventOptions } from "@/lib/queries/event";
import { communityInfo } from "@/lib/queries/community";
import { imageHeight, imageWidth } from "@/components/features/event/constants";

interface PageProps {
  params: Promise<{ orgType: string; orgId: string; postId: string }>;
}

const COMMUNITY_BANNER_FALLBACK =
  "ipfs://bafybeib2gyk2yagrcdrnhpgbaj6an6ghk2liwx2mshhoa6d54y2mheny24";

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

  let backgroundSrc = "";
  let backgroundWidth = 0;
  let backgroundHeight = 0;

  if (orgType === "event") {
    try {
      const eventData = await queryClient.fetchQuery(eventOptions(orgId));
      backgroundSrc = eventData.imageUri;
      backgroundWidth = imageWidth;
      backgroundHeight = imageHeight;
    } catch {
      notFound();
    }
  } else {
    try {
      const communityData = await queryClient.fetchQuery(communityInfo(orgId));
      backgroundSrc =
        communityData.bannerUri.length > 0
          ? communityData.bannerUri
          : COMMUNITY_BANNER_FALLBACK;
      backgroundWidth = 3840;
      backgroundHeight = 720;
    } catch {
      notFound();
    }
  }

  const feedId = `${orgType}:${orgId}:main`;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer
        background={{
          src: backgroundSrc,
          width: backgroundWidth,
          height: backgroundHeight,
        }}
      >
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
