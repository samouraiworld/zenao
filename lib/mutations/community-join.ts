import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import {
  communityUserRoles,
  communityInfo,
  communityUsersWithRoles,
} from "../queries/community";
import { zenaoClient } from "@/lib/zenao-client";

interface JoinCommunityRequest {
  communityId: string;
  token: string;
  userAddress: string | null;
}

export const useJoinCommunity = () => {
  const queryClient = getQueryClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ communityId, token }: JoinCommunityRequest) => {
      if (!token) throw new Error("Missing auth token");

      await zenaoClient.joinCommunity(
        { communityId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: async (_, { communityId, userAddress }) => {
      const rolesOpts = communityUserRoles(communityId, userAddress);
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
