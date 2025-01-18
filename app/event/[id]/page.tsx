import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EventInfo } from "./event-info";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(eventOptions(p.id));
  return (
    <div className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      <div className="h-screen flex flex-col justify-center items-center">
        <main className="flex flex-col mb-10 justify-center items-center">
          <div className="flex gap-4 mt-8 items-center flex-col">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <EventInfo id={p.id} />
            </HydrationBoundary>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
