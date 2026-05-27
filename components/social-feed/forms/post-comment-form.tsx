"use client";

import { UseFormReturn } from "react-hook-form";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { OrgType } from "@/lib/organization";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { useToast } from "@/hooks/use-toast";
import { userInfoOptions } from "@/lib/queries/user";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { captureException } from "@/lib/report";
import CommunityPostCommentForm from "@/components/features/community/community-post-comment-form";
import EventPostCommentForm from "@/components/features/event/event-post-comment-form";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

interface PostCommentFormProps {
  orgType: OrgType;
  orgId: string;
  parentId: bigint;
  form: UseFormReturn<SocialFeedPostFormSchemaType>;
}

export default function PostCommentForm({
  orgType,
  orgId,
  parentId,
  form,
}: PostCommentFormProps) {
  const { toast } = useToast();
  const t = useTranslations("social-feed.standard-post-form");

  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";
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
        orgType,
        orgId,
        content: values.content,
        parentId: parentId.toString(),
        token,
        userId: userProfileId,
        tags: [],
      });
      trackEvent("PostCommented", {
        props: {
          orgType,
          orgId,
          postId: parentId.toString(),
        },
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
          <div className="w-full">
            {t("comment-restricted-to-participants")}
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        {orgType === "event" && (
          <EventPostCommentForm
            form={form}
            eventId={orgId}
            userId={userProfileId}
            onSubmit={onSubmit}
            isPending={isPending}
          />
        )}
        {orgType === "community" && (
          <CommunityPostCommentForm
            form={form}
            communityId={orgId}
            userId={userProfileId}
            onSubmit={onSubmit}
            isPending={isPending}
          />
        )}
      </SignedIn>
    </>
  );
}
