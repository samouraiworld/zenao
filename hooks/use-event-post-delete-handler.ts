import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "./use-toast";
import { userAddressOptions } from "@/lib/queries/user";
import { useDeletePost } from "@/lib/mutations/social-feed";
import { captureException } from "@/lib/report";

function useEventPostDeleteHandler(feedId: string) {
  const t = useTranslations();
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { deletePost, isPending: isDeleting } = useDeletePost();

  const onDelete = async (postId: string, parentId?: string) => {
    const token = await getToken();

    try {
      if (!token || !userAddress) {
        throw new Error("not authenticated");
      }

      await deletePost({
        feedId,
        postId,
        parentId,
        token,
        userAddress,
      });

      toast({
        title: t("toast-delete-post-success"),
      });
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

  return {
    onDelete,
    isDeleting,
  };
}

export default useEventPostDeleteHandler;
