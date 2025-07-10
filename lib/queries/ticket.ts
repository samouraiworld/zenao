import { queryOptions } from "@tanstack/react-query";
import { GetToken } from "../utils";
import { zenaoClient } from "@/lib/zenao-client";

export const eventTickets = (eventId: string, getToken: GetToken) =>
  queryOptions({
    queryKey: ["tickets", eventId],
    queryFn: async () => {
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
    },
  });
