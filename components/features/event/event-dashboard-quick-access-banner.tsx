"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { userInfoOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";
import { Card } from "@/components/widgets/cards/card";

interface EventDashboardQuickAccessBannerProps {
  eventId: string;
}

function OrganizerQuickAccessBanner({
  eventId,
}: EventDashboardQuickAccessBannerProps) {
  const t = useTranslations("event.event-dashboard-banners");
  return (
    <Card className="w-full flex flex-col md:flex-row space-between gap-2">
      <p className="md:grow">{t("organizer")}</p>
      <div>
        <Link
          href={`/dashboard/event/${eventId}`}
          className="text-main hover:underline"
        >
          {t("edit-event")}
        </Link>
      </div>
    </Card>
  );
}

function GatekeeperQuickAccessBanner({
  eventId,
}: EventDashboardQuickAccessBannerProps) {
  const t = useTranslations("event.event-dashboard-banners");

  return (
    <Card className="w-full flex flex-col md:flex-row space-between gap-2">
      <p className="md:grow">{t("gatekeeper")}</p>
      <div>
        <Link
          href={`/dashboard/event/${eventId}/participants`}
          className="text-main hover:underline"
        >
          {t("start-scanning")}
        </Link>
      </div>
    </Card>
  );
}

export default function EventDashboardQuickAccessBanner({
  eventId,
}: EventDashboardQuickAccessBannerProps) {
  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );

  const userProfileId = userInfo?.userId;

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userProfileId),
  );

  if (
    !userProfileId ||
    (!roles.includes("organizer") && !roles.includes("gatekeeper"))
  ) {
    return null;
  }

  if (roles.includes("organizer")) {
    return <OrganizerQuickAccessBanner eventId={eventId} />;
  }

  // Gatekeeper quick access banner
  return <GatekeeperQuickAccessBanner eventId={eventId} />;
}
