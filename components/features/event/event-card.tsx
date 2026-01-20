"use client";

import { Eye, EyeOff, Lock, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import Heading from "../../widgets/texts/heading";
import Text from "../../widgets/texts/text";
import { Card } from "../../widgets/cards/card";
import { UserAvatarWithName } from "../user/user";
import { EventImage } from "./event-image";
import { makeLocationFromEvent } from "@/lib/location";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import { locationTimezone } from "@/lib/event-location";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { SafeEventInfo } from "@/types/schemas";

const EventDateTime = ({
  startDate,
  timezone,
  fullDate,
}: {
  startDate: bigint;
  timezone: string;
  fullDate: boolean;
}) => {
  return (
    <Text variant="secondary" suppressHydrationWarning>
      {formatTZ(fromUnixTime(Number(startDate)), fullDate ? "PPp" : "p O", {
        timeZone: timezone,
      })}
    </Text>
  );
};

export function EventCard({
  evt,
  href,
  fullDate = true,
}: {
  evt: SafeEventInfo;
  href: string;
  fullDate?: boolean;
}) {
  const iconSize = 16;
  const location = makeLocationFromEvent(evt.location);
  const eventTimezone = locationTimezone(location);
  const timezone = useLayoutTimezone(eventTimezone);
  const t = useTranslations("event-card");
  const tImages = useTranslations("images");

  const locationString =
    location.kind === "geo" || location.kind === "custom"
      ? location.address
      : location.location;

  return (
    <Link href={href} className="group">
      <Card className="flex flex-col w-full overflow-hidden p-0 bg-secondary/50 hover:bg-secondary/100 gap-2">
        <div className="w-full">
          <EventImage
            src={evt.imageUri}
            sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
            fill
            alt={tImages("event-presentation")}
            className="group-hover:opacity-80"
            quality={60}
          />
        </div>
        <div className="py-2 px-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <EventDateTime
                startDate={evt.startDate}
                timezone={timezone}
                fullDate={fullDate}
              />

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    {evt.discoverable ? (
                      <Eye className="size-5" />
                    ) : (
                      <EyeOff className="size-5" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {evt.discoverable
                      ? t("discoverable-tooltip")
                      : t("hidden-tooltip")}
                  </TooltipContent>
                </Tooltip>
                {evt.privacy && evt.privacy.eventPrivacy.case === "guarded" && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="size-5" />
                    </TooltipTrigger>
                    <TooltipContent>{t("exclusive-event")}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="flex flex-row gap-2 items-baseline">
              <Heading level={1} size="xl" className="mb-1 line-clamp-3">
                {evt.title}
              </Heading>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <MapPin width={iconSize} height={iconSize} className="min-w-4" />
              <Text className="line-clamp-1">{locationString} </Text>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <Users width={iconSize} height={iconSize} />
              <Text className="truncate">{evt.participants} going</Text>
            </div>
            <div className="flex flex-row gap-2 items-center">
              {/* XXX: Display all organizers */}
              {t("hosted-by")} <UserAvatarWithName userId={evt.organizers[0]} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
