import Link from "next/link";
import { create, MessageInitShape } from "@bufbuild/protobuf";
import { EventInfoSchema } from "@/app/gen/zenao/v1/zenao_pb";

export function EventCard({
  evt: evtPartial,
}: {
  evt: MessageInitShape<typeof EventInfoSchema>;
}) {
  const evt = create(EventInfoSchema, evtPartial);
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
          evtPartial,
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
