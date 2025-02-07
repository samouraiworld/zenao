import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventCard } from "@/components/cards/EventCard";

export default async function DiscoverPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(eventsList(now - 1, 0, 20));

  return (
    <ScreenContainer>
      <h1>Discover events</h1>
      <Link
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
        target="_blank"
      >
        -&gt; See this list on Gnoweb
      </Link>
      <h2>Upcoming</h2>
      {[...upcoming].reverse().map((evt) => (
        <EventCard key={evt.pkgPath} evt={evt} />
      ))}
      <h2>Past</h2>
      {past.map((evt) => (
        <EventCard key={evt.pkgPath} evt={evt} />
      ))}
    </ScreenContainer>
  );
}
