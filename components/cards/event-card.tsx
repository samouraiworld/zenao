"use client";

import { format, fromUnixTime } from "date-fns";
import { MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { UserAvatarWithName } from "../common/user";
import { Web3Image } from "../images/web3-image";
import Heading from "../texts/heading";
import Text from "../texts/text";
import { Card } from "./Card";
import EventDateTime from "./event-date-time";
import { makeLocationFromEvent } from "@/lib/location";
import { determineTimezone } from "@/lib/determine-timezone";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
export function EventCard({ evt, href }: { evt: EventInfo; href: string }) {
  const iconSize = 16;
  const location = makeLocationFromEvent(evt.location);
  const timezone = determineTimezone(location);
  const t = useTranslations("event");

  const locationString =
    location.kind === "geo" || location.kind === "custom"
      ? location.address
      : location.location;

  return (
    <div className="flex flex-col md:flex-row md:justify-between">
      <div className="min-w-32 sm:left-6 relative md:left-0 md:flex">
        <div className="flex flex-row items-center gap-[6px] mb-3 md:items-start md:mb-0 md:gap-0 md:flex-col">
          <Text>{format(fromUnixTime(Number(evt.startDate)), "MMM d")}</Text>
          <Text variant="secondary" size="sm">
            {format(fromUnixTime(Number(evt.startDate)), "iiii")}
          </Text>
        </div>
      </div>
      <div className="flex flex-row w-full justify-between">
        <div className="max-sm:hidden mr-5">
          <div className="h-[10px] w-[10px] rounded-xl relative right-[4px] bg-secondary-color" />
          <div className="h-full border-l-2 border-dashed border-secondary-color opacity-30" />
        </div>
        <Link className="w-full flex" href={href}>
          <Card className="md:h-[185px] w-full min-w-full max-w-full flex flex-row justify-between mb-3 hover:bg-secondary/100">
            <div className="flex flex-col gap-2">
              <EventDateTime startDate={evt.startDate} timezone={timezone} />
              <div className="flex flex-row gap-2 items-baseline">
                <Heading level={1} size="xl" className="mb-1 line-clamp-3">
                  {evt.title}
                </Heading>
              </div>
              <div className="hidden md:flex flex-row gap-2 items-center">
                <MapPin width={iconSize} height={iconSize} />
                <Text className="line-clamp-1">{locationString} </Text>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Users width={iconSize} height={iconSize} />
                <Text className="truncate">{evt.participants} going</Text>
              </div>
              <div className="flex flex-row gap-2 items-center">
                {/* XXX: Display all organizers & use the i18n traduction */}
                {t("hosted-by")}{" "}
                <UserAvatarWithName address={evt.organizers[0]} />
              </div>
            </div>
            <div>
              <div className="min-w-[80px] min-h-[80px] w-[80px] h-[80px] md:w-[120px] md:h-[120px] relative">
                <Web3Image
                  src={evt.imageUri}
                  width={200}
                  height={200}
                  alt="Event presentation"
                  className="object-cover rounded-xl w-full h-full"
                  quality={60}
                />
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
