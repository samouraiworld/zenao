import { PinIcon, PinOffIcon } from "lucide-react";
import { EventCard } from "./event-card";
import { Button } from "@/components/shadcn/button";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

export default function PinnableEventCard({
  evt,
  href,
  pinned,
  onPin,
}: {
  evt: EventInfo;
  href: string;
  pinned?: boolean;
  onPin: () => void;
}) {
  return (
    <div className="relative">
      <EventCard evt={evt} href={href} />
      {onPin && (
        <div className="absolute top-2 right-2">
          <Button
            onClick={() => {
              onPin();
            }}
          >
            {pinned ? <PinOffIcon /> : <PinIcon />}
          </Button>
        </div>
      )}
    </div>
  );
}
