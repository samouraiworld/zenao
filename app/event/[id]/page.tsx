import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { EventInfo } from "./event-info";
import { imageWidth } from "./constants";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventUserRoles } from "@/lib/queries/event-user-roles";
import { userFromAddress } from "@/lib/queries/user";

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
      images: [{ url: event.imageUri }],
    },
  };
}

export default async function EventPage({ params }: Props) {
  const p = await params;
  const { getToken } = await auth();
  const authToken = await getToken();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(eventOptions(p.id));
  const event = queryClient.getQueryData(eventOptions(p.id).queryKey);
  if (event) {
    await queryClient.prefetchQuery(userFromAddress(event.creator));
  }

  const eventData = await queryClient.fetchQuery(eventOptions(p.id));
  void queryClient.prefetchQuery(eventUserRoles(authToken, p.id));

  return (
    <ScreenContainer
      background={{ src: eventData.imageUri, width: imageWidth }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventInfo id={p.id} authToken={authToken} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
