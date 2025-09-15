import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EditCommunityForm } from "./edit-community-form";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";

export default async function EditCommunityPage({
  params,
}: {
  params: { id: string };
}) {
  const queryClient = getQueryClient();
  const { id: communityId } = params;

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EditCommunityForm communityId={communityId} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
