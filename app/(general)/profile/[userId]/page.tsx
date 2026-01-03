import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";
import { profileDetailsSchema } from "@/types/schemas";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ userId: string }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata | undefined> {
  const queryClient = getQueryClient();
  const { userId } = await params;

  if (!userId) {
    return undefined;
  }

  try {
    const profileData = await queryClient.fetchQuery(profileOptions(userId));

    if (
      !profileData?.bio &&
      !profileData?.displayName &&
      !profileData?.avatarUri
    ) {
      return undefined;
    }

    const profileDetails = deserializeWithFrontMatter({
      serialized: profileData?.bio,
      schema: profileDetailsSchema,
      defaultValue: {
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

export default async function ProfilePage({ params }: Props) {
  const queryClient = getQueryClient();
  const { userId } = await params;

  if (!userId) {
    notFound();
  }

  queryClient.prefetchQuery(profileOptions(userId));
  const now = Date.now() / 1000;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <ProfileInfo userId={userId} now={now} />
      </ScreenContainer>
    </HydrationBoundary>
  );
}
