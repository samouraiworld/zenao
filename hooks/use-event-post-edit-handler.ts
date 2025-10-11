import { useAuth } from "@clerk/clerk-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEditStandardPost } from "@/lib/mutations/social-feed";
import { userInfoOptions } from "@/lib/queries/user";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { captureException } from "@/lib/report";

function useEventPostEditHandler(feedId: string) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { editPost, isPending: isEditing } = useEditStandardPost();

  const onEditStandardPost = async (
    postId: string,
    values: FeedPostFormSchemaType,
  ) => {
    try {
      if (values.kind === "POLL") {
        throw new Error("invalid kind");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid token");
      }
      await editPost({
        content: values.content,
        feedId,
        tags: [],
        postId,
        token,
        userRealmId: userRealmId || "",
      });
    } catch (error) {
      captureException(error);
    }
  };

  return {
    onEditStandardPost,
    isEditing,
  };
}

export default useEventPostEditHandler;
