"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DashboardImportantInfo from "./dashboard-important-info";
import DashboardEventHeader from "./dashboard-event-header";
import { makeLocationFromEvent } from "@/lib/location";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { SafeEventInfo } from "@/types/schemas";

interface DashboardEventDetailsProps {
  eventId: string;
  eventInfo: SafeEventInfo;
  realmId: string;
}

export default function DashboardEventInfo({
  eventId,
  eventInfo,
  realmId: _realmId,
}: DashboardEventDetailsProps) {
  const location = makeLocationFromEvent(eventInfo.location);

  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId =
    communities.length > 0
      ? communityIdFromPkgPath(communities[0].pkgPath)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <DashboardImportantInfo eventId={eventId} eventInfo={eventInfo} />
      <DashboardEventHeader
        eventId={eventId}
        eventInfo={eventInfo}
        location={location}
        communityId={communityId}
      />
    </div>
  );
}
