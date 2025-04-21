import { useMutation } from "@tanstack/react-query";

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
      // TODO use endpoint
      console.log(eventId, token, message);
    },
  });

  return {
    broadcastEmail: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
