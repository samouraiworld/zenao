import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventCard } from "@/components/cards/EventCard";
import { LargeText } from "@/components/texts/LargeText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";

export default async function DiscoverPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(eventsList(now - 1, 0, 20));

  return (
    <ScreenContainer>
      <div className="flex flex-col sm:flex-row gap-2 items-center mb-3">
        <VeryLargeText>Discover events</VeryLargeText>
        <Link
          href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
          target="_blank"
        >
          -&gt; See this list on Gnoweb
        </Link>
      </div>
      <LargeText className="mb-2">Upcoming</LargeText>
      {[...upcoming].reverse().map((evt) => (
        <EventCard key={evt.pkgPath} evt={evt} />
      ))}
      <LargeText className="mb-2">Past</LargeText>
      {past.map((evt) => (
        <EventCard key={evt.pkgPath} evt={evt} />
      ))}
    </ScreenContainer>
  );
}
