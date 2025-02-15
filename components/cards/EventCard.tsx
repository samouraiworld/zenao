import Image from "next/image";
import Link from "next/link";
import { Calendar, CircleUserRound, MapPin, Users } from "lucide-react";
import { format, fromUnixTime } from "date-fns";
import { SmallText } from "../texts/SmallText";
import { LargeText } from "../texts/LargeText";
import { Text } from "../texts/DefaultText";
import { Card } from "./Card";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { web2URL } from "@/lib/uris";

export function EventCard({ evt }: { evt: EventInfo }) {
  const iconSize = 16;

  let location = "";
  if (
    evt.location?.address.case === "geo" ||
    evt.location?.address.case === "custom"
  ) {
    location = evt.location?.address.value.address;
  } else if (evt.location?.address.case === "virtual") {
    location = evt.location?.address.value.uri;
  }
  return (
    <Link href={`/event/${idFromPkgPath(evt.pkgPath)}`}>
      <Card className="h-[275px] flex flex-col sm:flex-row mb-3 hover:bg-secondary/100">
        <div className="w-[250px] h-[250px] relative mb-2 sm:mr-5 sm:mb-0 self-center">
          <Image
            src={web2URL(evt.imageUri)}
            priority
            fill
            alt="event-image"
            className="object-contain sm:object-cover rounded-xl"
          />
        </div>
        <div className="flex flex-col gap-2">
          <LargeText className="truncate mb-1">{evt.title}</LargeText>
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <div className="flex flex-row gap-2 items-center">
                <Text>
                  {format(fromUnixTime(Number(evt.startDate)), "PPP")}
                </Text>
                <SmallText variant="secondary">
                  {format(fromUnixTime(Number(evt.startDate)), "p")}
                </SmallText>
              </div>
              <div className="flex flex-row text-sm gap-1">
                <SmallText variant="secondary">
                  {format(fromUnixTime(Number(evt.endDate)), "PPp")}
                </SmallText>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <MapPin width={iconSize} height={iconSize} />
            {/* TODO: Add location */}
            <Text>{location}</Text>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Users width={iconSize} height={iconSize} />
            <Text>{evt.participants} going</Text>
          </div>
          <div className="hidden sm:flex sm:flex-row sm:gap-4 sm:items-center">
            <CircleUserRound width={iconSize} height={iconSize} />
            <Text className="truncate">{evt.creator}</Text>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function idFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
