import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import DashboardEventTabs from "./dashboard-event-tabs";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { eventGatekeepersEmails, eventOptions } from "@/lib/queries/event";
import { EventUserRole } from "@/lib/queries/event-users";
import {
  communitiesListByEvent,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import DashboardEventInfo from "@/components/features/dashboard/event/dashboard-event-info";
import DashboardEventEditionContextProvider from "@/components/providers/dashboard-event-edition-context-provider";
import DashboardEventContextProvider from "@/components/providers/dashboard-event-context-provider";
import withEventRoleRestrictions from "@/lib/permissions/with-roles-required";

interface DashboardEventInfoLayoutProps {
  params: Promise<{ id: string }>;
  roles: EventUserRole[];
  children?: React.ReactNode;
}

async function DashboardEventInfoLayoutProps({
  children,
  params,
  roles,
}: DashboardEventInfoLayoutProps) {
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

  queryClient.prefetchInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );

  const renderLayout = () => (
    <div className="flex flex-col gap-8 pb-16 md:pb-0">
      <DashboardEventInfo />
      <DashboardEventTabs>{children}</DashboardEventTabs>
    </div>
  );

  if (roles.includes("gatekeeper")) {
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardEventContextProvider
          eventId={eventId}
          eventInfo={eventInfo}
          roles={roles}
        >
          {renderLayout()}
        </DashboardEventContextProvider>
      </HydrationBoundary>
    );
  }

  queryClient.prefetchQuery(eventGatekeepersEmails(eventId, getToken));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardEventContextProvider
        eventId={eventId}
        eventInfo={eventInfo}
        roles={roles}
      >
        <DashboardEventEditionContextProvider>
          {renderLayout()}
        </DashboardEventEditionContextProvider>
      </DashboardEventContextProvider>
    </HydrationBoundary>
  );
}

export default withEventRoleRestrictions(
  DashboardEventInfoLayoutProps,
  ["organizer", "gatekeeper"],
  {
    notFoundOnFail: true,
  },
);
