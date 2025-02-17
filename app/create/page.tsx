import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CreateEventForm } from "./CreateEventForm";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { timezoneOptions } from "@/lib/queries/event";

export default function CreateEventPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(timezoneOptions());

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CreateEventForm />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
