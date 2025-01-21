import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EventInfo } from "./event-info";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(eventOptions(p.id));

  return (
    <ScreenContainer>
      <main className="flex flex-col max-w-[960px] mb-10">
        <div className="mt-8 mx-5">
          <HydrationBoundary state={dehydrate(queryClient)}>
            <EventInfo id={p.id} />
          </HydrationBoundary>
        </div>
      </main>
    </ScreenContainer>
  );
}
