import { useMutation } from "@tanstack/react-query";
import { zenaoClient } from "@/lib/zenao-client";

type ConfirmTicketPaymentRequest = {
  orderId: string;
  checkoutSessionId?: string;
};

export const useConfirmTicketPayment = () => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      orderId,
      checkoutSessionId,
    }: ConfirmTicketPaymentRequest) => {
      return await zenaoClient.confirmTicketPayment({
        orderId,
        checkoutSessionId: checkoutSessionId ?? "",
      });
    },
    mutationKey: ["confirmTicketPayment"],
  });

  return {
    confirmPayment: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
