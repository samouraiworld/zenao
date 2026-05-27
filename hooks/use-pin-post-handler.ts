import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAnalyticsEvents } from "./use-analytics-events";
import { useToast } from "./use-toast";
import { captureException } from "@/lib/report";
import { OrgType } from "@/lib/organization";
import { usePinPostUpdate } from "@/lib/mutations/social-feed";
import { userInfoOptions } from "@/lib/queries/user";

export default function usePinPostHandler(
  orgType: OrgType,
  orgId: string,
  feedId: string,
  parentId: string = "",
) {
  const { toast } = useToast();
  const t = useTranslations("social-feed.actions");
  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { updatePinPost, isPending: isPinning } = usePinPostUpdate(getToken);
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";

  const onPinChange = async (postId: string, pinned: boolean) => {
    try {
      await updatePinPost({
        postId,
        feedId,
        pinned,
        parentId,
        userId: userProfileId,
      });

      trackEvent("PostPinUpdated", {
        props: {
          orgType,
          orgId,
          postId,
        },
      });

      toast({
        title: pinned
          ? t("toast-post-pin-success")
          : t("toast-post-unpin-success"),
      });
    } catch (error) {
      if (error instanceof Error) {
        captureException(error);
        toast({
          title: pinned
            ? t("toast-post-pin-error")
            : t("toast-post-unpin-error"),
          variant: "destructive",
        });
      }
    }
  };

  return { onPinChange, isPinning };
}
