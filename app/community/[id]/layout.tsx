import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import CommunityInfoLayout from "../community-info-layout";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import {
  communityInfo,
  communityUsersWithRoles,
} from "@/lib/queries/community";
import { profileOptions } from "@/lib/queries/profile";
import { web2URL } from "@/lib/uris";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { communityDetailsSchema } from "@/types/schemas";

interface PageProps {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
}

// enable ssg for all events
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: communityId } = await params;
  const queryClient = getQueryClient();

  let communityData;

  try {
    communityData = await queryClient.fetchQuery(communityInfo(communityId));
  } catch (_) {
    notFound();
  }

  const { description, shortDescription } = deserializeWithFrontMatter({
    serialized: communityData.description || "",
    schema: communityDetailsSchema,
    defaultValue: {
      description: "",
      shortDescription: "",
      socialMediaLinks: [],
      portfolio: [],
    },
    contentFieldName: "description",
  });

  return {
    title: communityData.displayName,
    description: communityData.description,
    openGraph: {
      title: communityData.displayName,
      description: shortDescription || description || "",
      images: [
        {
          url: web2URL(communityData.avatarUri),
        },
        {
          url: web2URL(communityData.bannerUri),
        },
      ],
    },
  };
}

// revalidate every 60 seconds
export const revalidate = 60;

async function CommunityPageLayout({ params, children }: PageProps) {
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
    communityUsersWithRoles(communityId, ["member"]),
  );

  members.forEach((member) =>
    queryClient.prefetchQuery(profileOptions(member.address)),
  );

  await queryClient.prefetchQuery(
    communityUsersWithRoles(communityId, ["event"]),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer
        background={{
          src:
            communityData.bannerUri.length > 0
              ? communityData.bannerUri
              : "ipfs://bafybeib2gyk2yagrcdrnhpgbaj6an6ghk2liwx2mshhoa6d54y2mheny24",
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
