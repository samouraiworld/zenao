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
  displayName: string;
  description: string;
  avatarUri: string;
  bannerUri: string;
  administrators: string[];
}

interface EditCommunityResponse {
  communityId: string;
}

export const useEditCommunity = () => {
  const queryClient = getQueryClient();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation<
    EditCommunityResponse,
    Error,
    EditCommunityRequest
  >({
    mutationFn: async ({
      token,
      displayName,
      description,
      avatarUri,
      bannerUri,
      administrators,
    }) => {
      if (!token) throw new Error("Missing auth token");

      const response = await zenaoClient.editCommunity( // wait for endpoint
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

      return {
        communityId: response.communityId, // I assume
      };
    },

    onSuccess: async ({ communityId }, { administrators }) => {
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
    editCommunity: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
