import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { useAnalyticsEvents } from "./use-analytics-events";
import { useToast } from "./use-toast";
import { captureException } from "@/lib/report";
import { OrgType } from "@/lib/organization";
import { usePinPostUpdate } from "@/lib/mutations/social-feed";

export default function usePinPostHandler(
  orgType: OrgType,
  orgId: string,
  feedId: string,
) {
  const { toast } = useToast();
  const t = useTranslations();
  const { getToken } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { updatePinPost, isPending: isPinning } = usePinPostUpdate(getToken);

  const onPinChange = async (postId: string, pinned: boolean) => {
    try {
      // Query
      trackEvent("PostPinUpdated", {
        props: {
          orgType,
          orgId,
          postId,
        },
      });

      await updatePinPost({ postId, feedId, pinned });
    } catch (error) {
      if (error instanceof Error) {
        captureException(error);
      }
    }
  };

  return { onPinChange, isPinning };
}
