import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProfileInfoLayout } from "./profile-info-layout";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";

import { profileDetailsSchema } from "@/types/schemas";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { web2URL } from "@/lib/uris";

type PageProps = {
  params: Promise<{ userId: string }>;
  children?: React.ReactNode;
};

export const revalidate = 60;

export async function generateStaticParams() {
  console.log("asfausaiuddddssioajsa");

  return [];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const queryClient = getQueryClient();

  try {
    const profileData = await queryClient.fetchQuery(profileOptions(userId));

    if (
      !profileData?.bio &&
      !profileData?.displayName &&
      !profileData?.avatarUri
    ) {
      notFound();
    }

    const profileDetails = deserializeWithFrontMatter({
      serialized: profileData?.bio,
      schema: profileDetailsSchema,
      defaultValue: {
        portfolio: [],
        bio: "",
        socialMediaLinks: [],
        location: "",
        shortBio: "",
        bannerUri: "",
        experiences: [],
        skills: [],
      },
      contentFieldName: "bio",
    });

    return {
      title: `${profileData.displayName} - Zenao`,
      description: profileDetails.shortBio || profileDetails.bio || undefined,
      openGraph: {
        title: `${profileData.displayName}`,
        description: profileDetails.shortBio || profileDetails.bio || undefined,
        images: [
          {
            url: web2URL(profileData.avatarUri),
          },
          {
            url: web2URL(profileDetails.bannerUri),
          },
        ],
      },
    };
  } catch (e) {
    console.log("Failed to fetch profile: ", e);
    notFound();
  }
}

export default async function ProfilePageLayout({
  params,
  children,
}: PageProps) {
  const queryClient = getQueryClient();
  const { userId } = await params;

  if (!userId) {
    notFound();
  }

  queryClient.prefetchQuery(profileOptions(userId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <ProfileInfoLayout userId={userId}>{children}</ProfileInfoLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
