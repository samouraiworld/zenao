import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { EventsList } from "@/components/lists/events-list";

export function DiscoverEventsList({
  from,
  upcoming,
  past,
}: {
  from: "upcoming" | "past";
  upcoming: EventInfo[];
  past: EventInfo[];
}) {
  return <EventsList list={from === "upcoming" ? upcoming : past} />;
}
