import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";
import { UserRealmId, userRealmIdSchema } from "@/types/schemas";

type Props = {
  params: Promise<{ realmId: string[] }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export default async function ProfilePage({ params }: Props) {
  const queryClient = getQueryClient();
  const { realmId: realmIdUnsafe } = await params;

  let realmId: UserRealmId;

  try {
    realmId = await userRealmIdSchema.parseAsync(realmIdUnsafe.join("/"));
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
