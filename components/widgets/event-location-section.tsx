import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import Heading from "../texts/heading";
import { EventFormSchemaType } from "../form/types";

function EventLocationSection({
  location,
}: {
  location: EventFormSchemaType["location"];
}) {
  const iconSize = 22;

  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-4 items-center mb-2">
        <div className="w-[22px] h-[22px]">
          <MapPin width={iconSize} height={iconSize} />
        </div>
        {location.kind === "virtual" ? (
          <Link href={location.location} target="_blank">
            <Heading
              level={2}
              size="xl"
              className="hover:underline hover:underline-offset-1"
            >
              {location.location}
            </Heading>
          </Link>
        ) : location.kind === "geo" ? (
          <Link
            href={`https://www.google.com/maps/search/?api=1&query=&${location.lat},${location.lng}`}
            target="_blank"
          >
            <div className="flex flex-row gap-2 group">
              <Heading level={2} size="xl" className="group-hover:underline">
                {location.address}{" "}
                {location.kind === "geo" && <ExternalLink className="inline" />}
              </Heading>
            </div>
          </Link>
        ) : (
          <Heading level={2} size="xl">
            {location.address}
          </Heading>
        )}
      </div>
      {/* {location.kind === "geo" && (
              <MapCaller lat={location.lat} lng={location.lng} />
            )} */}
    </div>
  );
}

export default EventLocationSection;
