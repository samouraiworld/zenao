"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { StandardPostForm } from "@/components/social-feed/forms/standard-post-form";
import { useToast } from "@/hooks/use-toast";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { CommunityUserRole } from "@/lib/queries/community";
import { userInfoOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";

export default function PostCommentForm({
  communityId,
  parentId,
  userRoles,
  form,
}: {
  communityId: string;
  parentId: bigint;
  userRoles: CommunityUserRole[];
  form: UseFormReturn<SocialFeedPostFormSchemaType>;
}) {
  const { toast } = useToast();
  const t = useTranslations("social-feed.standard-post-form");

  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { createStandardPost, isPending } = useCreateStandardPost();

  const onSubmit = async (values: SocialFeedPostFormSchemaType) => {
    try {
      if (values.kind !== "STANDARD_POST") {
        throw new Error("invalid form");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await createStandardPost({
        orgType: "community",
        orgId: communityId,
        content: values.content,
        parentId: parentId.toString(),
        token,
        userRealmId,
        tags: [],
      });

      toast({
        title: t("toast-post-creation-success"),
      });

      form.resetField("content", { defaultValue: "" });
      form.resetField("parentPostId");
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
    }
  };

  return (
    <>
      <SignedOut>
        <div className="flex justify-center w-full">
          <div className="w-full">{t("comment-restricted-to-members")}</div>
        </div>
      </SignedOut>
      <SignedIn>
        {!userRoles.includes("administrator") &&
        !userRoles.includes("member") ? (
          <div className="flex justify-center w-full">
            <div className="w-full">{t("comment-restricted-to-members")}</div>
          </div>
        ) : (
          <div className="flex justify-center w-full transition-all duration-300 bg-secondary/80">
            <div className="w-full">
              <StandardPostForm
                form={form}
                postTypeMode={"STANDARD_POST"}
                setPostTypeMode={() => {
                  console.log("not available");
                }}
                onSubmit={onSubmit}
                isLoading={isPending}
              />
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
