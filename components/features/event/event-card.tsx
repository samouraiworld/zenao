"use client";

import { MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import { UserAvatarWithName } from "../../common/user";
import { Web3Image } from "../../images/web3-image";
import Heading from "../../widgets/texts/heading";
import Text from "../../widgets/texts/text";
import { AspectRatio } from "../../shadcn/aspect-ratio";
import { Card } from "../../widgets/cards/card";
import { makeLocationFromEvent } from "@/lib/location";
import { determineTimezone } from "@/lib/determine-timezone";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

const EventDateTime = ({
  startDate,
  timezone,
}: {
  startDate: bigint;
  timezone: string;
}) => {
  return (
    <Text variant="secondary">
      {formatTZ(fromUnixTime(Number(startDate)), "p O", {
        timeZone: timezone,
      })}
    </Text>
  );
};

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
    <Link href={href} className="group">
      <Card className="flex flex-col w-full overflow-hidden p-0 bg-secondary/50 hover:bg-secondary/100 gap-2">
        <div className="w-full">
          <AspectRatio ratio={16 / 9}>
            <Web3Image
              src={evt.imageUri}
              sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
              fill
              alt="Event presentation"
              className="w-full object-cover self-center group-hover:opacity-80"
              quality={60}
            />
          </AspectRatio>
        </div>
        <div className="py-2 px-4">
          <div className="flex flex-col gap-2">
            <EventDateTime startDate={evt.startDate} timezone={timezone} />
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
              {t("hosted-by")}{" "}
              <UserAvatarWithName address={evt.organizers[0]} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
