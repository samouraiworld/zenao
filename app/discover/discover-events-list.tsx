"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { eventsList } from "@/lib/queries/events-list";
import { EventsList } from "@/components/lists/events-list";

export function DiscoverEventsList({ now }: { now: number }) {
  const [from] = useQueryState<"upcoming" | "past">(
    "from",
    parseAsStringLiteral(["upcoming", "past"] as const)
      .withDefault("upcoming")
      .withOptions({ shallow: false, throttleMs: 200 }),
  );

  const { data: events } = useSuspenseQuery(
    from === "upcoming"
      ? eventsList(now, Number.MAX_SAFE_INTEGER, 20)
      : eventsList(now - 1, 0, 20),
  );

  return <EventsList list={events} />;
}
