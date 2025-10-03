"use client";

import React from "react";
import { EventInfoLayout } from "./event-info-layout";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EventPage({ params }: Props) {
  const { id } = React.use(params);
  return <EventInfoLayout eventId={id} />;
}
