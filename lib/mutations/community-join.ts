import { useMutation } from "@tanstack/react-query";
import { zenaoClient } from "@/lib/zenao-client";
import { getQueryClient } from "../get-query-client";
import { communityUserRoles, communityInfo, communityUsersWithRoles } from "../queries/community";

type JoinCommunityRequest = {
  communityId: string;
  token: string;
  userAddress: string | null;
};

export const useJoinCommunity = () => {
  const queryClient = getQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, token }: JoinCommunityRequest) => {
      if (!token) throw new Error("Missing auth token");

      return zenaoClient.joinCommunity(
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
};
