"use client";

import { useTranslations } from "next-intl";
import ConfirmationDialog from "./confirmation-dialog";

type DeletePostConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void | Promise<void>;
  isDeleting?: boolean;
};

export function DeletePostConfirmationDialog({
  open,
  onOpenChange,
  onDelete,
  isDeleting,
}: DeletePostConfirmationDialogProps) {
  const t = useTranslations("delete-post-confirmation-dialog");

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("desc")}
      confirmText={t("delete")}
      cancelText={t("cancel")}
      onConfirm={async () => await onDelete?.()}
      isPending={isDeleting}
      confirmButtonAriaLabel="delete post"
    />
  );
}
