import { useMutation } from "@tanstack/react-query";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

type EventCheckoutRequest = {
  eventId: string;
  lineItems: {
    priceId: string;
    attendeeEmail: string;
  }[];
  password: string;
  successPath: string;
  cancelPath: string;
  token: string | null | undefined;
};

export const useEventCheckout = () => {
  const { buildHeaders } = useHeaderBuilder();

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      lineItems,
      password,
      successPath,
      cancelPath,
      token,
    }: EventCheckoutRequest) => {
      const headers = token ? buildHeaders(token) : {};

      return await zenaoClient.startTicketPayment(
        {
          eventId,
          lineItems,
          password,
          successPath,
          cancelPath,
        },
        { headers: headers },
      );
    },
    mutationKey: ["eventCheckout"],
  });

  return {
    startCheckout: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
