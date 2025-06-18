import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import { ButtonWithChildren } from "../buttons/button-with-children";
import { useToast } from "@/app/hooks/use-toast";
import { useMediaQuery } from "@/app/hooks/use-media-query";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
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
    } catch (error) {
      // Known errors
      if (error instanceof Error) {
        let toastMessage = "";
        switch (error.message) {
          case "event already started":
            toastMessage = t("event-already-started-error");
            break;
          case "user already checked-in":
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

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogClose />
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="">
            <DialogClose>
              <ButtonWithChildren variant="outline" disabled={isPending}>
                {t("go-back")}
              </ButtonWithChildren>
            </DialogClose>
            <ButtonWithChildren
              onClick={onCancel}
              className="w-fit"
              loading={isPending}
            >
              {t("cancel")}
            </ButtonWithChildren>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-6">
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("desc")}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <ButtonWithChildren variant="outline" disabled={isPending}>
              {t("go-back")}
            </ButtonWithChildren>
          </DrawerClose>
          <ButtonWithChildren onClick={onCancel} loading={isPending}>
            {t("cancel")}
          </ButtonWithChildren>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
