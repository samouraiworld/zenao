import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { eventOptions } from "../queries/event";
import { eventUserRoles, eventUsersWithRole } from "../queries/event-users";
import { eventTickets } from "../queries/ticket";
import { GetToken } from "../utils";
import { zenaoClient } from "../zenao-client";

type EventCancelRequest = {
  eventId: string;
  getToken: GetToken;
  userRealmId: string | null;
};

export const useEventCancel = () => {
  const queryClient = getQueryClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ eventId, getToken }: EventCancelRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.cancelEvent(
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
      const eventInfoOpts = eventOptions(variables.eventId);
      const eventUserRolesOpts = eventUserRoles(
        variables.eventId,
        variables.userRealmId,
      );
      const eventUsersWithRoleOpts = eventUsersWithRole(
        variables.eventId,
        "organizer",
      );
      const eventUsersWithRoleParticipantOpts = eventUsersWithRole(
        variables.eventId,
        "participant",
      );

      queryClient.invalidateQueries(eventInfoOpts);
      queryClient.invalidateQueries(eventTicketsOpts);
      queryClient.invalidateQueries(eventUserRolesOpts);
      queryClient.invalidateQueries(eventUsersWithRoleOpts);
      queryClient.invalidateQueries(eventUsersWithRoleParticipantOpts);
    },
  });

  return {
    cancelEvent: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
