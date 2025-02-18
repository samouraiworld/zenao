import { auth } from "@clerk/nextjs/server";
import { useTranslations } from "next-intl";
import React from "react";
import { EventInfo } from "../gen/zenao/v1/zenao_pb";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/ScreenContainer";
import { eventsByCreatorList } from "@/lib/queries/events-list";
import { zenaoClient } from "@/app/zenao-client";
import { EventsListLayout } from "@/components/layout/EventsListLayout";

const LoggedOutCreatedPage: React.FC = () => {
  const t = useTranslations("created");
  return (
    <ScreenContainerCentered isSignedOutModal>
      {t("logged-out")}
    </ScreenContainerCentered>
  );
};

const CreatedPageFC: React.FC<{
  upcoming: EventInfo[];
  past: EventInfo[];
}> = ({ upcoming, past }) => {
  const t = useTranslations("created");
  return (
    <EventsListLayout upcoming={upcoming} past={past} title={t("title")} />
  );
};

export default async function CreatedPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    return <LoggedOutCreatedPage />;
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
      <CreatedPageFC upcoming={upcoming} past={past} />
    </ScreenContainer>
  );
}
