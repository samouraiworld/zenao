import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { imageHeight, imageWidth } from "./constants";
import { ExclusiveEventGuard } from "./event-exclusive-guard";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;

  let event;
  try {
    const queryClient = getQueryClient();
    event = await queryClient.fetchQuery(eventOptions(id));
    return {
      title: event.title,
      openGraph: {
        images: [{ url: web2URL(event.imageUri) }],
      },
    };
  } catch {
    notFound();
  }
}

export default async function EventLayout({ params, children }: Props) {
  // NOTE: we don't prefetch everything because using `auth()` breaks static generation
  const p = await params;

  const queryClient = getQueryClient();

  let eventData;
  try {
    eventData = await queryClient.fetchQuery(eventOptions(p.id));
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  const exclusive = eventData.privacy?.eventPrivacy.case === "guarded";

  const content = (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      {children}
    </ScreenContainer>
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {exclusive ? (
        <ExclusiveEventGuard
          eventId={p.id}
          title={eventData.title}
          imageUri={eventData.imageUri}
        >
          {content}
        </ExclusiveEventGuard>
      ) : (
        content
      )}
    </HydrationBoundary>
  );
}
