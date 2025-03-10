import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { eventsByCreatorList } from "@/lib/queries/events-list";
import { zenaoClient } from "@/app/zenao-client";
import { EventsListContainer } from "@/components/layout/events-list-container";

export default async function CreatedPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const t = await getTranslations("created");

  // Logged out
  if (!token) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("logged-out")}
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
    eventsByCreatorList(address, now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(
    eventsByCreatorList(address, now - 1, 0, 20),
  );

  return (
    <ScreenContainer>
      <EventsListContainer upcoming={upcoming} past={past} title={t("title")} />
    </ScreenContainer>
  );
}
