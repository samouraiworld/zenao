import { queryOptions } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { zenaoClient } from "@/app/zenao-client";

type GetToken = ReturnType<typeof useAuth>["getToken"];

// getToken is not used in the query key
export const userAddressOptions = (
  getToken: GetToken,
  userId: string | null | undefined, // this should be the authUserId not backend userId and is meant to be only used as the query key
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
    enabled: !!userId,
  });
