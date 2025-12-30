"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DashboardEventHeader from "./dashboard-event-header";
import { makeLocationFromEvent } from "@/lib/location";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";

export default function DashboardEventInfo() {
  const { eventId, eventInfo } = useDashboardEventContext();
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
      <DashboardEventHeader location={location} communityId={communityId} />
    </div>
  );
}
