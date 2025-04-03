// import { useSuspenseQuery } from "@tanstack/react-query";
// import { parseAsStringLiteral, useQueryState } from "nuqs";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
// import { eventsList } from "@/lib/queries/events-list";
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
  // const [from] = useQueryState<"upcoming" | "past">(
  //   "from",
  //   parseAsStringLiteral(["upcoming", "past"] as const)
  //     .withDefault("upcoming")
  //     .withOptions({ shallow: false, throttleMs: 200 }),
  // );

  console.log(from);

  return <EventsList list={from === "upcoming" ? upcoming : past} />;
}
