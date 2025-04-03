import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { SearchParams } from "nuqs";
import { TicketsEventsList } from "./tickets-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/ScreenContainer";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { zenaoClient } from "@/app/zenao-client";
import { EventsListLayout } from "@/components/layout/events-list-layout";
import { loadEventFilterSearchParams } from "@/lib/searchParams";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function TicketsPage({ searchParams }: PageProps) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        Log in to see your tickets
      </ScreenContainerCentered>
    );
  }

  const { address } = await zenaoClient.getUserAddress(
    {},
    { headers: { Authorization: "Bearer " + token } },
  );

  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const { from } = await loadEventFilterSearchParams(searchParams);

  switch (from) {
    case "upcoming":
      queryClient.prefetchQuery(
        eventsByParticipantList(address, now, Number.MAX_SAFE_INTEGER, 20),
      );
      break;
    case "past":
      queryClient.prefetchQuery(
        eventsByParticipantList(address, now - 1, 0, 20),
      );
      break;
  }

  const t = await getTranslations("tickets");

  return (
    <ScreenContainer>
      <EventsListLayout title={t("title")} description={t("description")}>
        <TicketsEventsList address={address} from={from} now={now} />
      </EventsListLayout>
    </ScreenContainer>
  );
}
