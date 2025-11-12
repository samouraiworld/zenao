import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
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

  let data;

  try {
    data = await queryClient.fetchQuery(eventOptions(id));
  } catch {
    notFound();
  }

  return <EventInfoLayout eventId={id} data={data} />;
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
