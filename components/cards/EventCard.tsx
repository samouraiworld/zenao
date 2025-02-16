import Link from "next/link";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

export function EventCard({ evt }: { evt: EventInfo }) {
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
