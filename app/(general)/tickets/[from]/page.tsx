import { redirect, RedirectType } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TicketsEventsList } from "../tickets-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { userInfoOptions } from "@/lib/queries/user";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/features/event/events-list-layout";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";
import {
  getActiveAccountServer,
  getTeamIdFromActiveAccount,
} from "@/lib/active-account/server";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ from: string }>;
};

export default async function TicketsPage({ params }: PageProps) {
  const { from } = await params;
  const t = await getTranslations("tickets");

  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  if (from !== "upcoming" && from !== "past") {
    redirect("/tickets", RedirectType.replace);
  }

  const { getToken, userId } = await auth();
  const token = await getToken();

  const activeAccount = await getActiveAccountServer();
  const teamId = getTeamIdFromActiveAccount(activeAccount);

  const userAddrOpts = userInfoOptions(getToken, userId, teamId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;

  if (!token || !userProfileId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("log-in")}
      </ScreenContainerCentered>
    );
  }

  queryClient.prefetchInfiniteQuery(
    from === "upcoming"
      ? eventsByParticipantList(
          userProfileId,
          DiscoverableFilter.UNSPECIFIED,
          now,
          Number.MAX_SAFE_INTEGER,
          20,
          getToken,
        )
      : eventsByParticipantList(
          userProfileId,
          DiscoverableFilter.UNSPECIFIED,
          now - 1,
          0,
          20,
          getToken,
        ),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout
          from={from}
          title={t("title")}
          description={t("description")}
          tabLinks={{ upcoming: "/tickets", past: "/tickets/past" }}
        >
          <TicketsEventsList userId={userProfileId} from={from} now={now} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
