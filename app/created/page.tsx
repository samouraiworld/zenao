import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { useTranslations } from "next-intl";
import { EventInfo } from "../gen/zenao/v1/zenao_pb";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/ScreenContainer";
import { eventsByCreatorList } from "@/lib/queries/events-list";
import { zenaoClient } from "@/app/zenao-client";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { EventsList } from "@/components/lists/EventsList";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";

const LoggedOutCreatedPage: React.FC = () => {
  const t = useTranslations("created");
  return (
    <ScreenContainerCentered isSignedOutModal>
      {t("logged-out")}
    </ScreenContainerCentered>
  );
};

const HeaderCreated: React.FC<{ address: string }> = ({ address }) => {
  const t = useTranslations("created");
  return (
    <div className="flex flex-col gap-2 mb-3">
      <VeryLargeText>{t("title")}</VeryLargeText>
      <Link
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg:created/${address}`}
        target="_blank"
      >
        <ButtonWithLabel className="w-auto" label={t("see-gnoweb")} />
      </Link>
    </div>
  );
};

const BodyCreated: React.FC<{
  upcoming: EventInfo[];
  past: EventInfo[];
}> = ({ upcoming, past }) => {
  const t = useTranslations("created");
  return (
    <div>
      <EventsList list={[...upcoming].reverse()} title={t("upcoming")} />
      <EventsList list={past} title={t("past")} />
    </div>
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
      <HeaderCreated address={address} />
      <BodyCreated upcoming={upcoming} past={past} />
    </ScreenContainer>
  );
}
