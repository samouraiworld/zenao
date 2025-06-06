import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { eventOptions } from "../queries/event";
import { currentTimezone } from "../time";
import { zenaoClient } from "@/app/zenao-client";
import { EventFormSchemaType } from "@/components/form/types";

export const useCreateEvent = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      password,
      exclusive,
      ...data
    }: EventFormSchemaType & {
      token: string;
    }) => {
      // Construct location object for the call
      let value = {};
      switch (data.location.kind) {
        case "custom":
          value = {
            address: data.location.address,
            timezone: data.location.timeZone,
          };
          break;
        case "virtual":
          value = { uri: data.location.location };
          break;
        case "geo":
          value = {
            address: data.location.address,
            lat: data.location.lat,
            lng: data.location.lng,
            size: data.location.size,
          };
          break;
        default:
          value = {};
      }

      return await zenaoClient.createEvent(
        {
          ...data,
          location: { address: { case: data.location.kind, value } },
          password: exclusive && password ? password : "",
        },
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
    },
  });

  return {
    createEvent: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

export const useEditEvent = () => {
  const queryClient = getQueryClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      token,
      password,
      exclusive,
      ...data
    }: EventFormSchemaType & {
      eventId: string;
      token: string;
    }) => {
      // Construct location object for the call
      let value = {};
      switch (data.location.kind) {
        case "custom":
          value = {
            address: data.location.address,
            timezone: currentTimezone(),
          };
          break;
        case "virtual":
          value = { uri: data.location.location };
          break;
        case "geo":
          value = {
            address: data.location.address,
            lat: data.location.lat,
            lng: data.location.lng,
            size: data.location.size,
          };
          break;
        default:
          value = {};
      }

      await zenaoClient.editEvent(
        {
          ...data,
          eventId,
          location: { address: { case: data.location.kind, value } },
          updatePassword: !exclusive || (!!password && password.length > 0),
          password: exclusive && password ? password : "",
        },
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries(eventOptions(variables.eventId));
    },
  });

  return {
    editEvent: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

type EventBroadcastEmailRequest = {
  eventId: string;
  token: string;
  message: string;
};

export const useEventBroadcastEmail = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      token,
      message,
    }: EventBroadcastEmailRequest) => {
      await zenaoClient.broadcastEvent(
        {
          eventId,
          message,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
  });

  return {
    broadcastEmail: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

type EventCheckInRequest = {
  signature: string;
  ticketPubkey: string;
  token: string;
};

export const useEventCheckIn = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      signature,
      ticketPubkey,
      token,
    }: EventCheckInRequest) => {
      await zenaoClient.checkin(
        {
          signature,
          ticketPubkey,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
  });

  return {
    checkIn: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
