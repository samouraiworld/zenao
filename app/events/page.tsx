import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EventList } from "./event-list";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getQueryClient } from "@/lib/get-query-client";
import { eventsOptions } from "@/lib/queries/event";

export default function Events() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(eventsOptions());

  return (
    <div className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      <div className="h-screen flex flex-col justify-center items-center">
        <main className="h-full flex flex-col mb-10 justify-center items-center">
          <div className="h-full gap-4 mt-8 items-center flex-col">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <EventList />
            </HydrationBoundary>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
