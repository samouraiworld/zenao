"use client";

import {
  CircleX,
  EllipsisVertical,
  PencilIcon,
  ScanQrCode,
} from "lucide-react";
import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import { useTranslations } from "next-intl";
import { EventImage } from "../../event/event-image";
import EventCommunitySection from "../../event/event-community-section";
import { EventSection } from "../../event/event-section";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { EventFormSchemaType, SafeEventInfo } from "@/types/schemas";

interface DashboardEventHeaderProps {
  eventId: string;
  eventInfo: SafeEventInfo;
  location: EventFormSchemaType["location"];
  communityId: string | null;
}

export default function DashboardEventHeader({
  eventId,
  eventInfo,
  location,
  communityId,
}: DashboardEventHeaderProps) {
  const t = useTranslations("dashboard.eventDetails.header");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        {/* Title of the event */}
        <Heading level={1} size="3xl">
          {eventInfo.title}
        </Heading>

        {/* Actions dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text className="hidden md:flex">{t("actions")}</Text>
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-48 space-y-1 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/event/${eventId}/scanner`}>
                  <ScanQrCode />
                  {t("openQrCodeScanner")}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/dashboard/event/${eventId}/edit`}>
                  <PencilIcon />
                  {t("edit")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CircleX />
              {t("cancel")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col w-full sm:flex-row sm:h-full gap-10">
        <div className="flex flex-col w-full sm:w-3/6">
          <EventImage
            src={eventInfo.imageUri}
            sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"
            fill
            alt="Event"
            priority
            fetchPriority="high"
          />
        </div>

        <div className="flex flex-col gap-8 w-full sm:w-3/6">
          {/* Date & Time */}
          <EventSection title={t("dateAndTime")}>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <Text>{t("from")}</Text>{" "}
                <Text variant="secondary" size="sm" suppressHydrationWarning>
                  {formatTZ(
                    fromUnixTime(Number(eventInfo.startDate)),
                    "PPPp O",
                  )}
                </Text>
              </div>
              <div className="flex flex-col">
                <Text>{t("to")}</Text>{" "}
                <Text variant="secondary" size="sm" suppressHydrationWarning>
                  {formatTZ(fromUnixTime(Number(eventInfo.endDate)), "PPPp O")}
                </Text>
              </div>
            </div>
            <div className="text-main hover:underline">
              <Link href={`/dashboard/event/${eventId}/edit`}>
                {t("updateEventTime")}
              </Link>
            </div>
          </EventSection>

          {/* Location */}
          <EventSection title={t("location")}>
            <div className="flex flex-row gap-2 items-center">
              {location.kind === "virtual" ? (
                <Link href={location.location} target="_blank">
                  <Text className="hover:underline hover:underline-offset-1">
                    {location.location}
                  </Text>
                </Link>
              ) : location.kind === "geo" ? (
                <Link
                  href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`}
                  target="_blank"
                >
                  <div className="flex flex-row gap-1 group items-center">
                    <Text className="group-hover:underline">
                      {location.address}{" "}
                    </Text>
                  </div>
                </Link>
              ) : (
                <Text>{location.address}</Text>
              )}
              <div className="text-main hover:underline">
                <Link href={`/dashboard/event/${eventId}/edit`}>
                  {t("updateLocation")}
                </Link>
              </div>
            </div>
          </EventSection>

          <EventSection title={t("capacity")}>
            <div className="flex gap-2">
              <Text>
                {eventInfo.capacity === 0
                  ? t("noPlaces")
                  : t("attendees", { count: eventInfo.capacity })}
              </Text>
              <div className="text-main hover:underline">
                <Link href={`/dashboard/event/${eventId}/edit`}>
                  {t("updateCapacity")}
                </Link>
              </div>
            </div>
          </EventSection>

          {/* Community */}
          {communityId && <EventCommunitySection communityId={communityId} />}
        </div>
      </div>
    </div>
  );
}
