import { queryOptions } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { zenaoClient } from "@/lib/zenao-client";
import { GetUserInfoResponse } from "@/app/gen/zenao/v1/zenao_pb";

type GetToken = ReturnType<typeof useAuth>["getToken"];

// getToken is not used in the query key
export const userInfoOptions = (
  getToken: GetToken,
  userId: string | null | undefined, // this should be the authUserId not backend userId and is meant to be only used as the query key
) =>
  queryOptions({
    queryKey: ["userInfo", userId],
    queryFn: async (): Promise<GetUserInfoResponse | null> => {
      if (!userId || !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }
      const authToken = await getToken();
      if (authToken == null) {
        return null;
      }

      return await zenaoClient.getUserInfo(
        {},
        { headers: { Authorization: "Bearer " + authToken } },
      );
    },
    enabled: !!userId,
  });
