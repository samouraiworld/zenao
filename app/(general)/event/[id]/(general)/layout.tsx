import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventInfoLayout } from "./event-info-layout";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

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
  const p = await params;

  let event;

  try {
    const queryClient = getQueryClient();
    event = await queryClient.fetchQuery(eventOptions(p.id));
  } catch {
    notFound();
  }

  return (
    <EventScreenContainer id={p.id}>
      <div className="flex flex-col gap-8">
        <EventInfoLayout eventId={p.id} data={event} />
        <div>{children}</div>
      </div>
    </EventScreenContainer>
  );
}
