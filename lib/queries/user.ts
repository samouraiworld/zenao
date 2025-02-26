import { queryOptions } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { GnoProfile, profiles } from "./profile";
import { zenaoClient } from "@/app/zenao-client";

export const userOptions = (address: string | null | undefined) =>
  queryOptions({
    queryKey: ["user", address],
    queryFn: async (): Promise<GnoProfile | null> => {
      if (!address || !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }
      return profiles.fetch(address);
    },
  });

type GetToken = ReturnType<typeof useAuth>["getToken"];

// getToken is not used in the query key
export const userAddressOptions = (
  getToken: GetToken,
  userId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["userAddress", userId],
    queryFn: async (): Promise<string | null> => {
      if (!userId || !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }
      const authToken = await getToken();
      if (authToken == null) {
        return null;
      }
      const { address } = await zenaoClient.getUserAddress(
        {},
        { headers: { Authorization: "Bearer " + authToken } },
      );
      return address;
    },
  });
