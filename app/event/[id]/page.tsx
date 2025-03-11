import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";
import { EventInfo } from "./event-info";
import { imageHeight, imageWidth } from "./constants";
import { Event, WithContext } from "schema-dts";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventUsersWithRole } from "@/lib/queries/event-users";
import { web2URL } from "@/lib/uris";
import { profileOptions } from "@/lib/queries/profile";

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

  const location =
    event.location?.address.case == "custom"
      ? event.location.address.value.address
      : "";
  const jsonLd: WithContext<Event> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: new Date(Number(event.startDate) * 1000).toISOString(),
    endDate: new Date(Number(event.endDate) * 1000).toISOString(),
    location,
    maximumAttendeeCapacity: event.capacity,
    image: web2URL(event.imageUri),
  };

  return {
    title: event.title,
    openGraph: {
      images: [{ url: web2URL(event.imageUri) }],
    },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}

export default async function EventPage({ params }: Props) {
  // NOTE: we don't prefetch everything because using `auth()` breaks static generation

  const p = await params;
  const queryClient = getQueryClient();

  const eventData = await queryClient.fetchQuery(eventOptions(p.id));
  if (eventData) {
    void queryClient.prefetchQuery(profileOptions(eventData.creator));
  }

  // Prefetch all participants profiles
  const addresses = await queryClient.fetchQuery(
    eventUsersWithRole(p.id, "participant"),
  );
  addresses.forEach(
    (address) => void queryClient.prefetchQuery(profileOptions(address)),
  );

  return (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventContent eventId={p.id} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
