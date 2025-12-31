"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { SafeEventInfo, SafeEventPrivacy } from "@/types/schemas";

interface DashboardImportantInfoProps {
  eventId: string;
  eventInfo: SafeEventInfo;
}

function EventGuardedInfoCard({
  eventId,
  eventPrivacy,
}: {
  eventId: string;
  eventPrivacy?: SafeEventPrivacy;
}) {
  const t = useTranslations("dashboard.eventDetails.importantInfo");

  if (!eventPrivacy) {
    return null;
  }

  if ((eventPrivacy.eventPrivacy.case ?? "public") === "guarded") {
    return (
      <Card className="flex flex-col md:flex-row md:justify-between items-center">
        <Text>{t("registrationRestricted")}</Text>
        <Link href={`/dashboard/event/${eventId}/edit`}>
          <Button variant="link" className="text-main">
            {t("updateRestrictions")}
          </Button>
        </Link>
      </Card>
    );
  }
}

function EventVisibilityInfoCard({
  eventId,
  discoverable,
}: {
  eventId: string;
  discoverable: boolean;
}) {
  const t = useTranslations("dashboard.eventDetails.importantInfo");

  return (
    <Card className="flex flex-col md:flex-row md:justify-between items-center">
      <Text>
        {!discoverable ? t("notPubliclyVisible") : t("publiclyVisible")}
      </Text>
      <Link href={`/dashboard/event/${eventId}/edit`}>
        <Button variant="link" className="text-main">
          {t("changeVisibility")}
        </Button>
      </Link>
    </Card>
  );
}

export default function DashboardImportantInfo({
  eventId,
  eventInfo,
}: DashboardImportantInfoProps) {
  return (
    <div className="flex flex-col gap-2">
      <EventVisibilityInfoCard
        eventId={eventId}
        discoverable={eventInfo.discoverable}
      />
      <EventGuardedInfoCard
        eventId={eventId}
        eventPrivacy={eventInfo.privacy}
      />
    </div>
  );
}
