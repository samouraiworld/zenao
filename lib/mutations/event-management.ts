import { useMutation } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
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

type EventCheckInRequest = {
  ticketSecret: string;
};

export const useEventCheckIn = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ ticketSecret }: EventCheckInRequest) => {
      console.log(ticketSecret);

      const _client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );

      // TODO
    },
  });

  return {
    checkIn: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
