import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { zenaoClient } from "@/app/zenao-client";
import { EventsListContainer } from "@/components/layout/events-list-container";

export default async function TicketsPage() {
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
  const upcoming = await queryClient.fetchQuery(
    eventsByParticipantList(address, now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(
    eventsByParticipantList(address, now - 1, 0, 20),
  );
  const t = await getTranslations("tickets");

  return (
    <ScreenContainer>
      <EventsListContainer
        upcoming={upcoming}
        past={past}
        title={t("title")}
        description={t("description")}
      />
    </ScreenContainer>
  );
}
