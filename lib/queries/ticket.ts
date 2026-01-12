import { queryOptions } from "@tanstack/react-query";
import { GetToken } from "../utils";
import { withSpan } from "../tracer";
import { buildQueryHeaders } from "./build-query-headers";
import { zenaoClient } from "@/lib/zenao-client";

export const eventTickets = (
  eventId: string,
  getToken: GetToken,
  teamId?: string,
) =>
  queryOptions({
    queryKey: ["tickets", eventId, teamId],
    queryFn: async () => {
      const token = await getToken();

      return withSpan(`query:backend:event:${eventId}:tickets`, async () => {
        if (!token) {
          throw new Error("User not logged in");
        }

        const data = await zenaoClient.getEventTickets(
          {
            eventId,
          },
          { headers: buildQueryHeaders(token, teamId) },
        );

        return data;
      });
    },
  });
