import { useMutation } from "@tanstack/react-query";
import { eventUserRoles, eventUsersWithRole } from "../queries/event-users";
import { eventOptions } from "../queries/event";
import { getQueryClient } from "../get-query-client";
import { zenaoClient } from "@/app/zenao-client";

type EventParticipateLoggedInRequest = {
  eventId: string;
  token: string;
  userId: string;
  userAddress: string;
};

export const getRelatedQueriesOptions = (variables: {
  eventId: string;
  userAddress: string | null;
}) => {
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

export const useEventParticipateLoggedIn = () => {
  const queryClient = getQueryClient();
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ eventId, token }: EventParticipateLoggedInRequest) => {
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

      return {
        previousEventUserRoles,
        previousEventOptions,
        previousUsersWithRoles,
      };
    },
    // onSuccess: (_, variables) => {
    //   const { eventOptionsOpts, eventUserRolesOpts, eventUsersWithRoleOpts } =
    //     getRelatedQueriesOptions(variables);

    //   // Invalidate queries
    //   queryClient.invalidateQueries(eventUserRolesOpts);
    //   queryClient.invalidateQueries(eventOptionsOpts);
    //   queryClient.invalidateQueries(eventUsersWithRoleOpts);
    // },
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

type EventParticipateGuestRequest = {
  eventId: string;
  email: string;
  userAddress: string | null;
};

export const useEventParticipateGuest = () => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ eventId, email }: EventParticipateGuestRequest) => {
      await zenaoClient.participate({ eventId, email });
    },
  });

  return {
    participate: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
