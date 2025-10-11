import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "./use-toast";
import { userInfoOptions } from "@/lib/queries/user";
import { useDeletePost } from "@/lib/mutations/social-feed";
import { captureException } from "@/lib/report";

function useFeedPostDeleteHandler(feedId: string) {
  const t = useTranslations();
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { deletePost, isPending: isDeleting } = useDeletePost();

  const onDelete = async (postId: string, parentId?: string) => {
    const token = await getToken();

    try {
      if (!token || !userRealmId) {
        throw new Error("not authenticated");
      }

      await deletePost({
        feedId,
        postId,
        parentId,
        token,
        userRealmId,
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

export default useFeedPostDeleteHandler;
