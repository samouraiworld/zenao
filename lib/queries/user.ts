import { queryOptions } from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { GetToken } from "../utils";
import { buildQueryHeaders } from "./build-query-headers";
import { zenaoClient } from "@/lib/zenao-client";
import { GetUserInfoResponse } from "@/app/gen/zenao/v1/zenao_pb";

export const userInfoOptions = (
  getToken: GetToken,
  userId: string | null | undefined, // Auth id // clerk userId
  teamId?: string,
) =>
  queryOptions({
    queryKey: ["userInfo", userId],
    queryFn: async (): Promise<GetUserInfoResponse | null> => {
      if (!userId) {
        return null;
      }

      return withSpan(`query:backend:user:${userId}`, async () => {
        const authToken = await getToken();
        if (authToken == null) {
          return null;
        }

        return await zenaoClient.getUserInfo(
          {},
          { headers: buildQueryHeaders(authToken, teamId) },
        );
      });
    },
    enabled: !!userId,
  });
