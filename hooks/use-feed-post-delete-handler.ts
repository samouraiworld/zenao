import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "./use-toast";
import { useAnalyticsEvents } from "./use-analytics-events";
import { userInfoOptions } from "@/lib/queries/user";
import { useDeletePost } from "@/lib/mutations/social-feed";
import { captureException } from "@/lib/report";
import { OrgType } from "@/lib/organization";

function useFeedPostDeleteHandler(
  orgType: OrgType,
  orgId: string,
  feedId: string,
) {
  const t = useTranslations();
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";
  const { deletePost, isPending: isDeleting } = useDeletePost();

  const onDelete = async (postId: string, parentId?: string) => {
    const token = await getToken();

    try {
      if (!token || !userProfileId) {
        throw new Error("not authenticated");
      }

      await deletePost({
        feedId,
        postId,
        parentId,
        token,
        userId: userProfileId,
      });
      trackEvent("PostDeleted", {
        props: {
          orgType,
          orgId,
          postId,
        },
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
