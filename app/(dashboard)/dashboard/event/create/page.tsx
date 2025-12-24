import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CreateEventForm } from "./create-event-form";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";

export default async function CreateEventPage() {
  const queryClient = getQueryClient();

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CreateEventForm />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
