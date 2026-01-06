import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProfileInfoLayout } from "./profile-info-layout";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";

import { gnoProfileDetailsSchema } from "@/types/schemas";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { web2URL } from "@/lib/uris";

type PageProps = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export const revalidate = 60;

export async function generateStaticParams() {
  console.log("asfausaiuddddssioajsa");

  return [];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata | undefined> {
  console.log("ytfdvuhfbzeiucebzuj");
  const { id: userId } = await params;
  const queryClient = getQueryClient();

  const realmId = `gno.land/r/zenao/users/u${userId}`;

  try {
    console.log("realmIdrealmIdrealmId", realmId);
    const profileData = await queryClient.fetchQuery(profileOptions(realmId));

    if (
      !profileData?.bio &&
      !profileData?.displayName &&
      !profileData?.avatarUri
    ) {
      return undefined;
    }

    const profileDetails = deserializeWithFrontMatter({
      serialized: profileData?.bio,
      schema: gnoProfileDetailsSchema,
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
    console.log("Failed to parse realmId: ", e);
    notFound();
  }
}

export default async function ProfilePageLayout({
  params,
  children,
}: PageProps) {
  const queryClient = getQueryClient();
  const { id: userId } = await params;

  const realmId = `gno.land/r/zenao/users/u${userId}`;

  console.log("realmIdrealmIdrealmIdrealmId", realmId);

  //   let profileData;
  //   try {
  //     profileData = await queryClient.fetchQuery(profileOptions(userRealmId));
  //   } catch (err) {
  //     console.error("error", err);
  //     notFound();
  //   }

  queryClient.prefetchQuery(profileOptions(realmId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        {/* <ProfileInfo realmId={realmId} now={now} /> */}

        <ProfileInfoLayout userId={userId}>{children}</ProfileInfoLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
