import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { zenaoClient } from "../zenao-client";
import {
  communityInfo,
  communityUserRoles,
  communityUsersWithRoles,
} from "../queries/community";

interface CreateCommunityRequest {
  token: string;
  userRealmId: string;
  displayName: string;
  description: string;
  avatarUri: string;
  bannerUri: string;
  administrators: string[];
}

export const useCreateCommunity = () => {
  const queryClient = getQueryClient();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      displayName,
      description,
      avatarUri,
      bannerUri,
      administrators,
    }: CreateCommunityRequest) => {
      const result = await zenaoClient.createCommunity(
        {
          displayName,
          description,
          avatarUri,
          bannerUri,
          administrators,
        },
        {
          headers: { Authorization: "Bearer " + token },
        },
      );

      return result.communityId;
    },
    onSuccess: async (communityId, variables) => {
      await queryClient.invalidateQueries(communityInfo(communityId));
      await queryClient.invalidateQueries(
        communityUserRoles(communityId, variables.userRealmId),
      );
      await queryClient.invalidateQueries(
        communityUsersWithRoles(communityId, ["administrator", "member"]),
      );
    },
  });

  return {
    createCommunity: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
