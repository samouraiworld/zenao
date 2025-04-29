import { redirect, RedirectType } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TicketsEventsList } from "../tickets-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/ScreenContainer";
import { userAddressOptions } from "@/lib/queries/user";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/events-list-layout";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ from: string }>;
};

export default async function TicketsPage({ params }: PageProps) {
  const { from } = await params;

  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  if (from !== "upcoming" && from !== "past") {
    redirect("/tickets", RedirectType.replace);
  }

  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userAddressOptions(getToken, userId);
  const address = await queryClient.fetchQuery(userAddrOpts);

  if (!token || !address) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        Log in to see your tickets
      </ScreenContainerCentered>
    );
  }

  queryClient.prefetchQuery(
    from === "upcoming"
      ? eventsByParticipantList(address, now, Number.MAX_SAFE_INTEGER, 20)
      : eventsByParticipantList(address, now - 1, 0, 20),
  );

  const t = await getTranslations("tickets");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout
          from={from}
          title={t("title")}
          description={t("description")}
          tabLinks={{ upcoming: "/tickets", past: "/tickets/past" }}
        >
          <TicketsEventsList address={address} from={from} now={now} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
