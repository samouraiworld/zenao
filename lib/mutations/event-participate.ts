import { QueryClient, useMutation } from "@tanstack/react-query";
import { eventUserRoles, eventUsersWithRole } from "../queries/event-users";
import { eventOptions } from "../queries/event";
import { zenaoClient } from "@/app/zenao-client";

const getRelatedQueriesOptions = (
  variables: EventParticipateLoggedInRequest,
) => {
  const eventUserRolesOpts = eventUserRoles(
    variables.eventId,
    variables.userAddress,
  );
  const eventOptionsOpts = eventOptions(variables.eventId);
  const eventUsersWithRoleOpts = eventUsersWithRole(
    variables.eventId,
    "participant",
  );

  return {
    eventOptionsOpts,
    eventUserRolesOpts,
    eventUsersWithRoleOpts,
  };
};

type EventParticipateLoggedInRequest = {
  eventId: string;
  token: string;
  userId: string;
  userAddress: string;
};

export const useEventParticipateLoggedIn = (queryClient: QueryClient) => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      token,
      userId: _id,
      userAddress: _address,
    }: EventParticipateLoggedInRequest) => {
      await zenaoClient.participate(
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onMutate: async (variables) => {
      // Cancel queries using eventUserRoles & eventOptions & eventUsersWithRole (impacted by new participation)
      const { eventOptionsOpts, eventUserRolesOpts, eventUsersWithRoleOpts } =
        getRelatedQueriesOptions(variables);

      queryClient.cancelQueries(eventUserRolesOpts);
      queryClient.cancelQueries(eventOptionsOpts);
      queryClient.cancelQueries(eventUsersWithRoleOpts);

      // Save previous data
      const previousEventUserRoles = queryClient.getQueryData(
        eventUserRolesOpts.queryKey,
      );
      const previousEventOptions = queryClient.getQueryData(
        eventOptionsOpts.queryKey,
      );
      const previousUsersWithRoles = queryClient.getQueryData(
        eventUsersWithRoleOpts.queryKey,
      );

      // Optimistic updates
      queryClient.setQueryData(eventUserRolesOpts.queryKey, (old) => [
        ...(old ?? []),
        "participant" as const,
      ]);
      queryClient.setQueryData(eventOptionsOpts.queryKey, (old) =>
        !old
          ? undefined
          : {
              ...old,
              participants: old.participants + 1,
            },
      );
      queryClient.setQueryData(eventUsersWithRoleOpts.queryKey, (old) => [
        ...(old ?? []),
        variables.userAddress,
      ]);

      return {
        previousEventUserRoles,
        previousEventOptions,
        previousUsersWithRoles,
      };
    },
    onSuccess: (_, variables) => {
      const { eventOptionsOpts, eventUserRolesOpts, eventUsersWithRoleOpts } =
        getRelatedQueriesOptions(variables);

      // Invalidate queries
      queryClient.invalidateQueries(eventUserRolesOpts);
      queryClient.invalidateQueries(eventOptionsOpts);
      queryClient.invalidateQueries(eventUsersWithRoleOpts);
    },
    onError: (_, variables, context) => {
      const { eventOptionsOpts, eventUserRolesOpts, eventUsersWithRoleOpts } =
        getRelatedQueriesOptions(variables);

      // Roll back if mutation fails
      queryClient.setQueryData(
        eventUserRolesOpts.queryKey,
        context?.previousEventUserRoles,
      );
      queryClient.setQueryData(
        eventOptionsOpts.queryKey,
        context?.previousEventOptions,
      );
      queryClient.setQueryData(
        eventUsersWithRoleOpts.queryKey,
        context?.previousUsersWithRoles,
      );
    },
    mutationKey: ["eventParticipate"],
  });

  return {
    participate: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
