import { queryOptions } from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { GetToken } from "@/lib/utils";
import { zenaoClient } from "@/lib/zenao-client";

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      return withSpan(`query:backend:event:${id}`, async () => {
        const res = await zenaoClient.getEvent({ eventId: id });
        if (res.event == null) {
          throw new Error("event not found");
        }
        return res.event;
      });
    },
    staleTime: Infinity,
  });

export const eventGatekeepersEmails = (eventId: string, getToken: GetToken) =>
  queryOptions({
    queryKey: ["event", eventId, "gatekeepers"],
    queryFn: async () => {
      return withSpan(
        `query:backend:event:${eventId}:gatekeepers`,
        async () => {
          const token = await getToken();

          if (!token) {
            throw new Error("not authenticated");
          }

          const data = await zenaoClient.getEventGatekeepers(
            {
              eventId,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );

          return data;
        },
      );
    },
  });

export function eventIdFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
