import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { GetToken } from "../utils";
import { zenaoClient } from "../zenao-client";
import { communityUsersWithRoles } from "../queries/community";

type AddEventToCommunityRequest = {
  communityId: string;
  eventId: string;
  getToken: GetToken;
};

export const useEventAddToCommunity = () => {
  const queryClient = getQueryClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      communityId,
      getToken,
    }: AddEventToCommunityRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.addEventToCommunity(
        {
          eventId,
          communityId,
        },
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
    },
    onSuccess: (_, variables) => {
      const communitiesUsersWithRolesOpts = communityUsersWithRoles(
        variables.communityId,
        ["event"],
      );
      queryClient.invalidateQueries(communitiesUsersWithRolesOpts);
    },
  });

  return {
    addEventToCommunity: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
