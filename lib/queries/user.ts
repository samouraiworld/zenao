import { queryOptions } from "@tanstack/react-query";
import { GnoProfile, profiles } from "./profile";
import { zenaoClient } from "@/app/zenao-client";

export const userOptions = (authToken: string | null) =>
  queryOptions({
    queryKey: ["user", authToken],
    queryFn: async (): Promise<GnoProfile | null> => {
      if (!authToken) {
        return null;
      }
      if (!process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }
      const { address } = await zenaoClient.getUserAddress(
        {},
        { headers: { Authorization: "Bearer " + authToken } },
      );
      return profiles.fetch(address);
    },
  });
