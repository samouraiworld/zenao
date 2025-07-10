import { useMutation } from "@tanstack/react-query";
import { eventUserRoles, eventUsersWithRole } from "../queries/event-users";
import { eventOptions } from "../queries/event";
import { getQueryClient } from "../get-query-client";
import { zenaoClient } from "@/lib/zenao-client";

type EventParticipateLoggedInRequest = {
  eventId: string;
  token: string;
  guests: string[];
  userId: string;
  userAddress: string;
  password: string;
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
    mutationFn: async ({
      eventId,
      guests,
      token,
      password,
    }: EventParticipateLoggedInRequest) => {
      await zenaoClient.participate(
        { eventId, guests, password },
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

type EventParticipateGuestRequest = {
  eventId: string;
  email: string;
  guests: string[];
  userAddress: string | null;
  password: string;
};

export const useEventParticipateGuest = () => {
  const queryClient = getQueryClient();
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      email,
      guests,
      password,
    }: EventParticipateGuestRequest) => {
      await zenaoClient.participate({ eventId, email, guests, password });
    },
    onSuccess: (_d, variables, _c) => {
      const { eventOptionsOpts, eventUserRolesOpts, eventUsersWithRoleOpts } =
        getRelatedQueriesOptions({
          eventId: variables.eventId,
          userAddress: variables.userAddress,
        });

      // Invalidate queries
      queryClient.invalidateQueries(eventOptionsOpts);
      queryClient.invalidateQueries(eventUsersWithRoleOpts);
      queryClient.cancelQueries(eventUserRolesOpts);
      queryClient.setQueryData(eventUserRolesOpts.queryKey, (old) => [
        ...(old ?? []),
        "participant" as const,
      ]);
    },
  });

  return {
    participate: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
