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
import { ButtonWithChildren } from "../widgets/buttons/button-with-children";
import { useToast } from "@/app/hooks/use-toast";
import { useMediaQuery } from "@/app/hooks/use-media-query";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
            <DialogClose asChild>
              <ButtonWithChildren
                className="w-fit"
                variant="outline"
                disabled={isPending}
              >
                {t("cancel")}
              </ButtonWithChildren>
            </DialogClose>
            <ButtonWithChildren
              onClick={onDelete}
              className="w-fit"
              aria-label="delete post"
              loading={isPending}
            >
              {t("delete")}
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
            onClick={onDelete}
            aria-label="delete post"
            loading={isPending}
          >
            {t("delete")}
          </ButtonWithChildren>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
