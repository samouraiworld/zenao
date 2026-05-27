import { queryOptions } from "@tanstack/react-query";
import { GetToken } from "@clerk/types";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { buildQueryHeaders } from "./build-query-headers";
import type { UserTeam } from "@/app/gen/zenao/v1/zenao_pb";

export const userTeamsOptions = (
  getToken: GetToken,
  userId: string | null | undefined,
) => {
  return queryOptions<UserTeam[]>({
    queryKey: ["userTeams", userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      const token = await getToken();
      if (!token) {
        return [];
      }

      return withSpan(`query:backend:userTeams:${userId}`, async () => {
        const res = await zenaoClient.getUserTeams(
          {},
          { headers: buildQueryHeaders(token) },
        );
        return res.teams;
      });
    },
    enabled: !!userId,
  });
};
