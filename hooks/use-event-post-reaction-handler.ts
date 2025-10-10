import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useReactPost } from "@/lib/mutations/social-feed";
import { userInfoOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";

function useEventPostReactionHandler(feedId: string, parentId: string = "") {
  const { getToken, userId } = useAuth();
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

export default useEventPostReactionHandler;
