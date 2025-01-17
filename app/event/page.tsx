import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EventInfo } from "./event-info";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";

export default function EventPage() {
  const eventID = "1";
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(eventOptions(eventID));
  return (
    <div className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      <div className="h-screen flex flex-col justify-center items-center">
        <main className="flex flex-col mb-10 justify-center items-center">
          <div className="flex gap-4 mt-8 items-center flex-col sm:flex-row">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <EventInfo id={eventID} />
            </HydrationBoundary>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
