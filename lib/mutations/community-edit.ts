import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import {
  communityInfo,
  communityUserRoles,
  communityUsersWithRoles,
} from "../queries/community";
import { zenaoClient } from "@/lib/zenao-client";

interface EditCommunityRequest {
  token: string;
  communityId: string;
  displayName: string;
  description: string;
  avatarUri: string;
  bannerUri: string;
  administrators: string[];
}

export const useEditCommunity = () => {
  const queryClient = getQueryClient();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      communityId,
      displayName,
      description,
      avatarUri,
      bannerUri,
      administrators,
    }: EditCommunityRequest) => {
      if (!token) throw new Error("Missing auth token");

      await zenaoClient.editCommunity(
        {
          communityId,
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
    },
    onSuccess: async (_, { communityId, administrators }) => {
      const userAddress = administrators[0];
      await queryClient.invalidateQueries(communityInfo(communityId));
      await queryClient.invalidateQueries(
        communityUserRoles(communityId, userAddress),
      );
      await queryClient.invalidateQueries(
        communityUsersWithRoles(communityId, ["administrator", "member"]),
      );
    },
  });

  return {
    mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
