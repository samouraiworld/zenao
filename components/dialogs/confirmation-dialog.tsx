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
import { ButtonWithChildren } from "../widgets/buttons/button-with-children";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import { useMediaQuery } from "@/app/hooks/use-media-query";

type ConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  confirmButtonAriaLabel?: string;
};

function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  isPending = false,
  confirmButtonAriaLabel = "confirm action",
}: ConfirmationDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const t = useTranslations("delete-post-confirmation-dialog");

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <ButtonWithChildren
                className="w-fit"
                variant="outline"
                disabled={isPending}
              >
                {cancelText || t("cancel")}
              </ButtonWithChildren>
            </DialogClose>
            <ButtonWithChildren
              onClick={handleConfirm}
              className="w-fit"
              aria-label={confirmButtonAriaLabel}
              loading={isPending}
            >
              {confirmText}
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
              {t("cancel")}
            </ButtonWithChildren>
          </DrawerClose>
          <ButtonWithChildren
            onClick={handleConfirm}
            aria-label={confirmButtonAriaLabel}
            loading={isPending}
          >
            {t("delete")}
          </ButtonWithChildren>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default ConfirmationDialog;
