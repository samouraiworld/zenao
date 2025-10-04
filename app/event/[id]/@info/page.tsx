import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EventInfoLayout } from "./event-info-layout";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const queryClient = getQueryClient();
  queryClient.prefetchQuery(eventOptions(id));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventInfoLayout eventId={id} />
    </HydrationBoundary>
  );
}

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
