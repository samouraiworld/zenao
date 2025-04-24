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
