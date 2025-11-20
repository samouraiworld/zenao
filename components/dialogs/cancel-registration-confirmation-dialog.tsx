import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import ConfirmationDialog from "./confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEventCancelParticipation } from "@/lib/mutations/event-cancel-participation";
import { userInfoOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

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
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { cancelParticipation, isPending } = useEventCancelParticipation();

  const onCancel = async () => {
    try {
      await cancelParticipation({
        eventId,
        getToken,
        userRealmId,
      });

      trackEvent("EventParticipationCanceled", {
        props: {
          eventId,
        },
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
