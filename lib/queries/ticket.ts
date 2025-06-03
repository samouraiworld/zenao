import { queryOptions } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { zenaoClient } from "@/app/zenao-client";

type GetToken = ReturnType<typeof useAuth>["getToken"];

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
