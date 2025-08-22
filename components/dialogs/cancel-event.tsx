import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import ConfirmationDialog from "./confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEventCancel } from "@/lib/mutations/event-cancel";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";

type CancelEventDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelEventDialog({
  eventId,
  open,
  onOpenChange,
}: CancelEventDialogProps) {
  const t = useTranslations("cancel-event-confirmation-dialog");
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { cancelEvent, isPending } = useEventCancel();

  const onConfirmCancel = async () => {
    try {
      await cancelEvent({
        eventId,
        getToken,
        userAddress,
      });

      toast({ title: t("toast-cancel-event-success") });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        let toastMessage = "";
        switch (error.message) {
          case "[unknown] events already started or starting within 24h cannot be cancelled":
            toastMessage = t("event-starting-soon-error");
            break;
          case "[unknown] only organizers can cancel an event":
            toastMessage = t("toast-only-organizer-can-cancel-error");
            break;
          default:
            captureException(error);
            toastMessage = t("toast-cancel-event-error");
        }

        toast({
          variant: "destructive",
          title: toastMessage,
        });
      }
    }
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("desc")}
      confirmText={t("confirm")}
      cancelText={t("go-back")}
      onConfirm={onConfirmCancel}
      isPending={isPending}
      confirmButtonAriaLabel="cancel event"
    />
  );
}
