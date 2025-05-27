import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { imageHeight, imageWidth } from "./constants";
import { ExclusiveEventGuard } from "./exclusive-event-guard";
import { EventInfoLayout } from "./event-info-layout";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventUsersWithRole } from "@/lib/queries/event-users";
import { web2URL } from "@/lib/uris";
import { profileOptions } from "@/lib/queries/profile";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
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
  let event;
  try {
    event = await queryClient.fetchQuery(eventOptions(id));
    return {
      title: event.title,
      openGraph: {
        images: [{ url: web2URL(event.imageUri) }],
      },
    };
  } catch (_) {
    notFound();
  }
}

export default async function EventLayout({ params, children }: Props) {
  // NOTE: we don't prefetch everything because using `auth()` breaks static generation
  const p = await params;
  const queryClient = getQueryClient();

  let eventData;
  try {
    eventData = await queryClient.fetchQuery({
      ...eventOptions(p.id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  queryClient.prefetchQuery(profileOptions(eventData.organizers[0]));

  // Prefetch all participants profiles
  const addresses = await queryClient.fetchQuery(
    eventUsersWithRole(p.id, "participant"),
  );
  addresses.forEach(
    (address) => void queryClient.prefetchQuery(profileOptions(address)),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExclusiveEventGuard
        eventId={p.id}
        title={eventData.title}
        imageUri={eventData.imageUri}
        exclusive={eventData.privacy?.eventPrivacy.case === "guarded"}
      >
        <ScreenContainer
          background={{
            src: eventData.imageUri,
            width: imageWidth,
            height: imageHeight,
          }}
        >
          <EventInfoLayout eventId={p.id}>{children}</EventInfoLayout>
        </ScreenContainer>
      </ExclusiveEventGuard>
    </HydrationBoundary>
  );
}
