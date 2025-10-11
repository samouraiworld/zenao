import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import {
  communityUserRoles,
  communityInfo,
  communityUsersWithRoles,
} from "../queries/community";
import { zenaoClient } from "@/lib/zenao-client";

interface LeaveCommunityRequest {
  communityId: string;
  token: string;
  userRealmId: string | null;
}

export const useLeaveCommunity = () => {
  const queryClient = getQueryClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ communityId, token }: LeaveCommunityRequest) => {
      if (!token) throw new Error("Missing auth token");

      await zenaoClient.leaveCommunity(
        { communityId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: async (_, { communityId, userRealmId }) => {
      const rolesOpts = communityUserRoles(communityId, userRealmId);
      const communityOpts = communityInfo(communityId);
      const usersWithRolesOpts = communityUsersWithRoles(communityId, [
        "member",
      ]);

      await queryClient.invalidateQueries(rolesOpts);
      await queryClient.invalidateQueries(communityOpts);
      await queryClient.invalidateQueries(usersWithRolesOpts);
    },
  });

  return {
    mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
