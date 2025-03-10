import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CreateEventYform } from "./create-event-yform";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";

export default function CreateEventPage() {
  const queryClient = getQueryClient();

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CreateEventYform />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
