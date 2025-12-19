import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAnalyticsEvents } from "./use-analytics-events";
import { useReactPost } from "@/lib/mutations/social-feed";
import { userInfoOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { OrgType } from "@/lib/organization";

function useFeedPostReactionHandler(
  orgType: OrgType,
  orgId: string,
  feedId: string,
  parentId: string = "",
) {
  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { reactPost, isPending: isReacting } = useReactPost();

  const onReactionChange = async (postId: string, icon: string) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing token");
      }
      await reactPost({
        token,
        userRealmId: userRealmId || "",
        postId,
        icon,
        feedId,
        parentId,
      });
      trackEvent("PostReactionUpdated", {
        props: {
          orgType,
          orgId,
          postId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        captureException(error);
      }
    }
  };

  return {
    onReactionChange,
    isReacting,
  };
}

export default useFeedPostReactionHandler;
