import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { GetToken } from "../utils";
import { zenaoClient } from "../zenao-client";

type AddEventToCommunityRequest = {
  communityId: string;
  eventId: string;
  getToken: GetToken;
};

export const useEventCancelParticipation = () => {
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
    onSuccess: (_, _variables, _ctx) => {
      // TODO Prepare queries invalidation
      void queryClient;
    },
  });

  return {
    addEventToCommunity: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
