"use client";

import PinnableEventCard from "../event/pinnable-event-card";
import { EventCard } from "../event/event-card";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

interface CommunityEventCardProps {
  evt: EventInfo;
  href: string;
  pinned?: boolean;
  onPin: () => void;
  isAdmin?: boolean;
}

export default function CommunityEventCard({
  evt,
  href,
  pinned,
  onPin,
  isAdmin,
}: CommunityEventCardProps) {
  if (!isAdmin) {
    return <EventCard evt={evt} href={href} />;
  }

  return (
    <PinnableEventCard evt={evt} href={href} pinned={pinned} onPin={onPin} />
  );
}
