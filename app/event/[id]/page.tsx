import { Metadata } from "next";
import { EventInfo } from "./event-info";
import { imageWidth } from "./constants";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventUserRoles } from "@/lib/queries/event-user-roles";

type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 60;

export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

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

  const authToken = null;

  const queryClient = getQueryClient();
  const [eventData, userRoles] = await Promise.all([
    queryClient.fetchQuery(eventOptions(p.id)),
    queryClient.fetchQuery(eventUserRoles(authToken, p.id)),
  ]);

  return (
    <ScreenContainer
      background={{ src: eventData.imageUri, width: imageWidth }}
    >
      <EventInfo
        id={p.id}
        event={eventData}
        userRoles={userRoles}
        authToken={authToken}
      />
    </ScreenContainer>
  );
}
