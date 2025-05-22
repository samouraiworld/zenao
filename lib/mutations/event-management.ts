import { useMutation } from "@tanstack/react-query";
import { zenaoClient } from "@/app/zenao-client";

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

type ValidateEventPasswordRequest = {
  eventId: string;
  password: string;
};

export const useValidateEventPassword = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ eventId, password }: ValidateEventPasswordRequest) => {
      const res = await zenaoClient.validatePassword({ eventId, password });

      return res;
    },
  });

  return {
    validateEventPassword: mutateAsync,
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
