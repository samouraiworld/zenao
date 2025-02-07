import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { EventCard } from "@/components/cards/EventCard";
import { zenaoClient } from "@/app/zenao-client";

export default async function TicketsPage() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return <ScreenContainer>Log in to see your tickets</ScreenContainer>;
  }
  const token = await getToken();

  const { address } = await zenaoClient.getUserAddress(
    {},
    { headers: { Authorization: "Bearer " + token } },
  );

  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsByParticipantList(address, now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(
    eventsByParticipantList(address, now - 1, 0, 20),
  );

  return (
    <ScreenContainer>
      <h1>Your tickets</h1>
      <Link
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg:tickets/${address}`}
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
