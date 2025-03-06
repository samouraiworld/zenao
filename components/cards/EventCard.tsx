import Image from "next/image";
import Link from "next/link";
import { CircleUserRound, MapPin, Users } from "lucide-react";
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
    <div className="flex flex-col sm:flex-row sm:justify-between">
      <div className="min-w-32 left-6 relative sm:left-0 sm:flex">
        <div className="flex flex-row items-center gap-[6px] mb-3 sm:items-start sm:mb-0 sm:gap-0 sm:flex-col">
          <Text>{format(fromUnixTime(Number(evt.startDate)), "MMM d")}</Text>
          <SmallText variant="secondary">
            {format(fromUnixTime(Number(evt.startDate)), "iiii")}
          </SmallText>
        </div>
      </div>
      <div className="flex flex-row w-full justify-between">
        <div className="mr-5">
          <div className="h-[10px] w-[10px] rounded-xl relative right-[4px] bg-secondary-color" />
          <div className="h-full border-l-2 border-dashed border-secondary-color opacity-30" />
        </div>
        <Link
          className="w-full flex"
          href={`/event/${idFromPkgPath(evt.pkgPath)}`}
        >
          <Card className="sm:h-[185px] w-full min-w-full max-w-full flex flex-row justify-between mb-3 hover:bg-secondary/100">
            <div className="flex flex-col gap-2">
              <Text variant="secondary">
                {format(fromUnixTime(Number(evt.startDate)), "h:mm a")}
              </Text>
              <LargeText className="mb-1 line-clamp-3">{evt.title}</LargeText>
              <div className="flex flex-row gap-2 items-center">
                <MapPin width={iconSize} height={iconSize} />
                <Text className="line-clamp-1">{location} </Text>
              </div>
              <div className="flex flex-row gap-4 items-center">
                <Users width={iconSize} height={iconSize} />
                <Text className="truncate">{evt.participants} going</Text>
              </div>
              <div className="hidden sm:flex sm:flex-row sm:gap-4 sm:items-center">
                <CircleUserRound width={iconSize} height={iconSize} />
                <Text className="truncate">{evt.creator}</Text>
              </div>
            </div>
            <div>
              <div className="min-w-[80px] min-h-[80px] w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] relative">
                <Image
                  src={web2URL(evt.imageUri) + "?img-width=240"}
                  priority
                  fill
                  alt="event-image"
                  className="object-cover rounded-xl"
                />
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function idFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
