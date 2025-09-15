import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { EditCommunityForm } from "./edit-community-form";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { communityInfo } from "@/lib/queries/community";

export default async function EditCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const { userId } = await auth();
  const queryClient = getQueryClient();
  const communityId = p.id;

  try {
    await queryClient.fetchQuery({
      ...communityInfo(communityId),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  return (
    <ScreenContainer isSignedOutModal={!userId}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {userId && <EditCommunityForm communityId={communityId} />}
      </HydrationBoundary>
    </ScreenContainer>
  );
}
