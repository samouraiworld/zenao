import { useAuth } from "@clerk/clerk-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "./use-toast";
import { useEditStandardPost } from "@/lib/mutations/social-feed";
import { userInfoOptions } from "@/lib/queries/user";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { captureException } from "@/lib/report";

function useFeedPostEditHandler(feedId: string) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();
  const { toast } = useToast();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { editPost, isPending: isEditing } = useEditStandardPost();

  const onEditStandardPost = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
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
      toast({
        variant: "destructive",
        title: t("toast-post-edit-error"),
      });
    }
  };

  return {
    onEditStandardPost,
    isEditing,
  };
}

export default useFeedPostEditHandler;
