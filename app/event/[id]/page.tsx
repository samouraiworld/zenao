import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";
import { EventInfo } from "./event-info";
import { imageHeight, imageWidth } from "./constants";
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

  // const { getToken, userId } = await auth();
  // const userAddress = await queryClient.fetchQuery(
  //   userAddressOptions(getToken, userId)
  // );

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

  // TODO: Fix this call
  // Prefetch Event's social feed posts
  // void queryClient.prefetchQuery(
  //   // TODO: Handle offset and limit with infinite scroll
  //   // TODO: Handle tags
  //   feedPosts(p.id, 0, 100, "", userAddress || "")
  // );

  return (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventInfo id={p.id} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
