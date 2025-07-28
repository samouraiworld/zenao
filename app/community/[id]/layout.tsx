import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import CommunityInfoLayout from "../community-info-layout";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { communityInfo, communityUsersWithRole } from "@/lib/queries/community";
import { profileOptions } from "@/lib/queries/profile";

// enable ssg for all events
export async function generateStaticParams() {
  return [];
}

// revalidate every 60 seconds
export const revalidate = 60;

async function CommunityPageLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  const { id: communityId } = await params;

  let communityData;
  try {
    communityData = await queryClient.fetchQuery(communityInfo(communityId));
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  communityData.administrators.map((admin) =>
    queryClient.prefetchQuery(profileOptions(admin)),
  );

  // Prefetch all members profiles
  const members = await queryClient.fetchQuery(
    communityUsersWithRole(communityId, ["member"]),
  );
  members.forEach(
    (member) => void queryClient.prefetchQuery(profileOptions(member.address)),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer
        background={{
          src: communityData.bannerUri,
          width: 3840,
          height: 720,
        }}
      >
        <CommunityInfoLayout communityId={communityId}>
          {children}
        </CommunityInfoLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}

export default CommunityPageLayout;
