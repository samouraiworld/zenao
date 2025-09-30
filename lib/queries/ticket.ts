import { queryOptions } from "@tanstack/react-query";
import { GetToken } from "../utils";
import { tracer } from "../tracer";
import { zenaoClient } from "@/lib/zenao-client";

export const eventTickets = (eventId: string, getToken: GetToken) =>
  queryOptions({
    queryKey: ["tickets", eventId],
    queryFn: async () => {
      const span = tracer.startSpan("query:event:" + eventId + ":tickets");
      try {
        const token = await getToken();

        if (!token) {
          throw new Error("User not logged in");
        }

        const data = await zenaoClient.getEventTickets(
          {
            eventId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        return data;
      } finally {
        span.end();
      }
    },
  });
