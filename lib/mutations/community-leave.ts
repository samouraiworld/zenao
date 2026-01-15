import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import {
  communityUserRoles,
  communityInfo,
  communityUsersWithRoles,
} from "../queries/community";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

interface LeaveCommunityRequest {
  communityId: string;
  token: string;
  userId: string | null;
}

export const useLeaveCommunity = () => {
  const queryClient = getQueryClient();
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ communityId, token }: LeaveCommunityRequest) => {
      if (!token) throw new Error("Missing auth token");

      await zenaoClient.leaveCommunity(
        { communityId },
        {
          headers: buildHeaders(token),
        },
      );
    },
    onSuccess: async (_, { communityId, userId }) => {
      const rolesOpts = communityUserRoles(communityId, userId);
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
