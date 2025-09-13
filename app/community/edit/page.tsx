import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EditCommunityForm } from "./edit-community-form";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";

export default async function CreateEventPage() {
  const queryClient = getQueryClient();

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EditCommunityForm communityId="1" />{" "}
        {/* <- tmp TODO: get community id, put in a [id] folder */}
      </HydrationBoundary>
    </ScreenContainer>
  );
}
