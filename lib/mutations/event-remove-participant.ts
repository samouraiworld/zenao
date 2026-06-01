import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { eventUsersWithRole } from "../queries/event-users";
import { GetToken } from "../utils";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

type RemoveParticipantRequest = {
  eventId: string;
  userId: string;
  getToken: GetToken;
};

export const useRemoveParticipant = () => {
  const queryClient = getQueryClient();
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      eventId,
      userId,
      getToken,
    }: RemoveParticipantRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.removeParticipant(
        { eventId, userId },
        { headers: buildHeaders(token) },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(
        eventUsersWithRole(variables.eventId, "participant"),
      );
    },
  });

  return {
    removeParticipant: mutateAsync,
    isPending,
  };
};
