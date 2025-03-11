import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";
import { EventInfo } from "./event-info";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { userOptions } from "@/lib/queries/user";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ id: string }>;
};

// enable ssg for all events
export async function generateStaticParams() {
  return [];
}

// revalidate every 60 seconds
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;

  const queryClient = getQueryClient();
  const event = await queryClient.fetchQuery(eventOptions(id));

  return {
    title: event.title,
    openGraph: {
      images: [{ url: web2URL(event.imageUri) }],
    },
  };
}

export default async function EventPage({ params }: Props) {
  // NOTE: we don't prefetch everything because using `auth()` breaks static generation

  const p = await params;
  const queryClient = getQueryClient();

  const eventData = await queryClient.fetchQuery(eventOptions(p.id));
  if (eventData) {
    void queryClient.prefetchQuery(userOptions(eventData.creator));
  }

  return (
    <ScreenContainer background={{ src: eventData.imageUri }}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventInfo id={p.id} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
