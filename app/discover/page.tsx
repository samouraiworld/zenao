import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventInfo } from "@/lib/gno";

export default async function EventsPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(eventsList(now - 1, 0, 20));

  return (
    <ScreenContainer>
      <Link
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
        target="_blank"
      >
        -&gt; See this list on Gnoweb
      </Link>
      <h2>Upcoming</h2>
      {[...upcoming].reverse().map((evt) => (
        <Event key={evt.pkgPath} evt={evt} />
      ))}
      <h2>Past</h2>
      {past.map((evt) => (
        <Event key={evt.pkgPath} evt={evt} />
      ))}
    </ScreenContainer>
  );
}

function Event({ evt }: { evt: EventInfo & { pkgPath: string } }) {
  return (
    <Link href={`/event/${idFromPkgPath(evt.pkgPath)}`}>
      <div
        style={{
          backgroundColor: "grey",
          margin: 10,
          whiteSpace: "pre",
          overflowX: "scroll",
        }}
      >
        {JSON.stringify(
          evt,
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          4,
        )}
      </div>
    </Link>
  );
}

function idFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
