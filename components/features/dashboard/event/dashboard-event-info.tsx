"use client";

import DashboardImportantInfo from "./dashboard-important-info";
import DashboardEventHeader from "./dashboard-event-header";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import { locationTimezone } from "@/lib/event-location";
import { makeLocationFromEvent } from "@/lib/location";

interface DashboardEventDetailsProps {
  eventId: string;
  eventInfo: EventInfo;
  realmId: string;
}

export default function DashboardEventInfo({
  eventId,
  eventInfo,
  realmId: _realmId,
}: DashboardEventDetailsProps) {
  const location = makeLocationFromEvent(eventInfo.location);
  const eventTimezone = locationTimezone(location);
  const _timezone = useLayoutTimezone(eventTimezone);

  return (
    <div className="flex flex-col gap-8">
      <DashboardImportantInfo eventId={eventId} eventInfo={eventInfo} />
      <DashboardEventHeader eventId={eventId} eventInfo={eventInfo} />
    </div>
  );
}
