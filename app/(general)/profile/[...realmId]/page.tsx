import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";
import {
  gnoProfileDetailsSchema,
  RealmId,
  realmIdSchema,
} from "@/types/schemas";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ realmId: string[] }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata | undefined> {
  const queryClient = getQueryClient();
  const { realmId: realmIdUnsafe } = await params;

  try {
    const realmId = await realmIdSchema.parseAsync(realmIdUnsafe.join("/"));
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

export default async function ProfilePage({ params }: Props) {
  const queryClient = getQueryClient();
  const { realmId: realmIdUnsafe } = await params;

  let realmId: RealmId;

  try {
    realmId = await realmIdSchema.parseAsync(realmIdUnsafe.join("/"));
  } catch (e) {
    console.log("Failed to parse realmId: ", e);
    notFound();
  }

  queryClient.prefetchQuery(profileOptions(realmId));
  const now = Date.now() / 1000;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <ProfileInfo realmId={realmId} now={now} />
      </ScreenContainer>
    </HydrationBoundary>
  );
}
