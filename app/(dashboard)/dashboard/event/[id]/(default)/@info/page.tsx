// Display basic event info: Title, Dates, Thumbnail, Community Sponsor, Hidden/Discoverable status, Protected/Unprotected status
// List of participants
// Gatekeepers
// Message broadcasting

import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { eventGatekeepersEmails, eventOptions } from "@/lib/queries/event";
import {
  communitiesListByEvent,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { eventUserRoles } from "@/lib/queries/event-users";
import DashboardEventInfo from "@/components/features/dashboard/event/dashboard-event-info";

interface DashboardEventInfoPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventInfoPage({
  params,
}: DashboardEventInfoPageProps) {
  const { id: eventId } = await params;
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userRealmId = userInfo?.realmId;

  const t = await getTranslations();

  if (!token || !userRealmId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("eventForm.log-in")}
      </ScreenContainerCentered>
    );
  }

  let eventInfo;
  try {
    eventInfo = await queryClient.fetchQuery({
      ...eventOptions(eventId),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }
  const roles = await queryClient.fetchQuery(
    eventUserRoles(eventId, userRealmId),
  );

  if (!roles.includes("organizer")) {
    notFound();
  }

  queryClient.prefetchInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  queryClient.prefetchQuery(eventGatekeepersEmails(eventId, getToken));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardEventInfo
        eventId={eventId}
        eventInfo={eventInfo}
        realmId={userRealmId}
      />
    </HydrationBoundary>
  );
}
