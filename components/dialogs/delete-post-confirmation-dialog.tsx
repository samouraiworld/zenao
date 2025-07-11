import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import ConfirmationDialog from "./confirmation-dialog";
import { useToast } from "@/app/hooks/use-toast";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { useDeletePost } from "@/lib/mutations/social-feed";

type DeletePostConfirmationDialogProps = {
  eventId: string;
  open: boolean;
  postId: bigint;
  parentId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function DeletePostConfirmationDialog({
  eventId,
  postId,
  parentId,
  open,
  onOpenChange,
  onSuccess,
}: DeletePostConfirmationDialogProps) {
  const { toast } = useToast();
  const t = useTranslations("delete-post-confirmation-dialog");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { deletePost, isPending } = useDeletePost();

  const onDelete = async () => {
    const token = await getToken();

    try {
      if (!token || !userAddress) {
        throw new Error("not authenticated");
      }

      await deletePost({
        eventId,
        postId: postId.toString(10),
        parentId,
        token,
        userAddress,
      });

      toast({
        title: t("toast-delete-post-success"),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        captureException(error);
        toast({
          variant: "destructive",
          title: t("toast-delete-post-error"),
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
      confirmText={t("delete")}
      cancelText={t("cancel")}
      onConfirm={onDelete}
      isPending={isPending}
      confirmButtonAriaLabel="delete post"
    />
  );
}
