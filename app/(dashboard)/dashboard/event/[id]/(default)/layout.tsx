import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import DashboardEventTabs from "./dashboard-event-tabs";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { eventGatekeepersEmails, eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";
import {
  communitiesListByEvent,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import DashboardEventInfo from "@/components/features/dashboard/event/dashboard-event-info";
import DashboardEventEditionContextProvider from "@/components/providers/dashboard-event-edition-context-provider";
import DashboardEventContextProvider from "@/components/providers/dashboard-event-context-provider";
import { withEventRoleRestrictions } from "@/lib/permissions/with-roles-required";
import {
  getActiveAccountServer,
  getTeamIdFromActiveAccount,
} from "@/lib/active-account/server";

interface DashboardEventInfoLayoutProps {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
}

async function DashboardEventInfoLayoutProps({
  children,
  params,
}: DashboardEventInfoLayoutProps) {
  const { id: eventId } = await params;
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  const token = await getToken();

  const activeAccount = await getActiveAccountServer();
  const teamId = getTeamIdFromActiveAccount(activeAccount);

  const userAddrOpts = userInfoOptions(getToken, userId, teamId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;

  const t = await getTranslations();

  if (!token || !userProfileId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("eventForm.log-in")}
      </ScreenContainerCentered>
    );
  }

  const entityId = activeAccount?.id ?? userProfileId;

  let eventInfo;

  try {
    eventInfo = await queryClient.fetchQuery({
      ...eventOptions(eventId),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  const roles = await queryClient.fetchQuery(eventUserRoles(eventId, entityId));

  queryClient.prefetchInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );

  const renderLayout = () => (
    <div className="flex flex-col gap-8 pb-16 md:pb-0">
      <DashboardEventInfo />
      <DashboardEventTabs roles={roles}>{children}</DashboardEventTabs>
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

  queryClient.prefetchQuery(eventGatekeepersEmails(eventId, getToken, teamId));

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
