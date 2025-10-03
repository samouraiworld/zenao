"use client";

import { Suspense } from "react";
import React from "react";
import { EventInfoLayout, EventInfoLayoutSkeleton } from "./event-info-layout";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EventPage({ params }: Props) {
  const { id } = React.use(params);
  return (
    <Suspense fallback={<EventInfoLayoutSkeleton />}>
      <EventInfoLayout eventId={id} />
    </Suspense>
  );
}
