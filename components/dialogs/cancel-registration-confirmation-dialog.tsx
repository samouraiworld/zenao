import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import ConfirmationDialog from "./confirmation-dialog";
import { useToast } from "@/app/hooks/use-toast";
import { useEventCancelParticipation } from "@/lib/mutations/event-cancel";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";

type CancelRegistrationConfirmationDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelRegistrationConfirmationDialog({
  eventId,
  open,
  onOpenChange,
}: CancelRegistrationConfirmationDialogProps) {
  const { toast } = useToast();
  const t = useTranslations("cancel-registration-confirmation-dialog");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { cancelParticipation, isPending } = useEventCancelParticipation();

  const onCancel = async () => {
    try {
      await cancelParticipation({
        eventId,
        getToken,
        userAddress,
      });

      toast({
        title: t("toast-cancel-participation-success"),
      });
      onOpenChange(false);
    } catch (error) {
      // Known errors
      if (error instanceof Error) {
        let toastMessage = "";
        switch (error.message) {
          case "[unknown] event already started":
            toastMessage = t("event-already-started-error");
            break;
          case "[unknown] user already checked-in":
            toastMessage = t("toast-user-already-checked-in-error");
            break;
          default:
            captureException(error);
            toastMessage = t("toast-cancel-participation-error");
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
      confirmText={t("cancel")}
      cancelText={t("go-back")}
      onConfirm={onCancel}
      isPending={isPending}
      confirmButtonAriaLabel="cancel participation"
    />
  );
}
