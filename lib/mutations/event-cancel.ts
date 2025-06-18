import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { GetToken } from "../utils";
import { eventTickets } from "../queries/ticket";
import { eventUserRoles, eventUsersWithRole } from "../queries/event-users";
import { zenaoClient } from "@/app/zenao-client";

type EventCancelParticipationRequest = {
  eventId: string;
  getToken: GetToken;
  userAddress: string | null;
};

export const useEventCancelParticipation = () => {
  const queryClient = getQueryClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      getToken,
    }: EventCancelParticipationRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      zenaoClient.cancelParticipation(
        {
          eventId,
        },
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
    },
    onSuccess: (_, variables, _ctx) => {
      const eventTicketsOpts = eventTickets(
        variables.eventId,
        variables.getToken,
      );
      const eventUserRolesOpts = eventUserRoles(
        variables.eventId,
        variables.userAddress,
      );
      const eventUsersWithRoleOpts = eventUsersWithRole(
        variables.eventId,
        "participant",
      );

      queryClient.invalidateQueries(eventTicketsOpts);
      queryClient.invalidateQueries(eventUserRolesOpts);
      queryClient.invalidateQueries(eventUsersWithRoleOpts);
    },
  });

  return {
    cancelParticipation: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
