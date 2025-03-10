import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { EventInfo } from "./event-info";
import { imageWidth } from "./constants";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventUserRoles, eventUsersWithRole } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { web2URL } from "@/lib/uris";
import { profileOptions } from "@/lib/queries/profile";

type Props = {
  params: Promise<{ id: string }>;
};

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
  const p = await params;
  const { getToken, userId } = await auth();
  const queryClient = getQueryClient();
  const address = await queryClient.fetchQuery(
    userAddressOptions(getToken, userId),
  );
  const eventData = await queryClient.fetchQuery(eventOptions(p.id));
  void queryClient.prefetchQuery(eventUserRoles(p.id, address));

  // Prefetch all participants profiles
  const addresses = await queryClient.fetchQuery(
    eventUsersWithRole(p.id, "participant"),
  );
  addresses.forEach((address) =>
    queryClient.prefetchQuery(profileOptions(address)),
  );

  return (
    <ScreenContainer
      background={{ src: eventData.imageUri, width: imageWidth }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventInfo id={p.id} userId={userId} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
