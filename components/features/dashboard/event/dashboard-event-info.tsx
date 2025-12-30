"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DashboardEventHeader from "./dashboard-event-header";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { makeLocationFromEvent } from "@/lib/location";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";

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
      <DashboardEventHeader
        eventId={eventId}
        eventInfo={eventInfo}
        location={location}
        communityId={communityId}
      />
    </div>
  );
}
