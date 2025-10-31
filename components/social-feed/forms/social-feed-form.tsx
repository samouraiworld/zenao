"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PollPostForm } from "./poll-post-form";
import { StandardPostForm } from "./standard-post-form";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { captureException } from "@/lib/report";
import { userInfoOptions } from "@/lib/queries/user";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { useToast } from "@/hooks/use-toast";
import { OrgType } from "@/lib/organization";
import { SocialFeedPostType } from "@/lib/social-feed";

const SocialFeedForm = ({
  orgType,
  orgId,
  form,
  isDisplayed = true,
}: {
  orgType: OrgType;
  orgId: string;
  isDisplayed?: boolean;
  form: UseFormReturn<SocialFeedPostFormSchemaType>;
}) => {
  const { toast } = useToast();

  const { createStandardPost, isPending } = useCreateStandardPost();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const t = useTranslations("social-feed.standard-post-form");

  const formContainerRef = useRef<HTMLDivElement>(null);
  const [postTypeMode, setPostTypeMode] =
    useState<SocialFeedPostType>("STANDARD_POST");

  useEffect(() => {
    if (postTypeMode === "POLL") {
      form.setValue("kind", "POLL");
    } else {
      form.setValue("kind", "STANDARD_POST");
    }
  }, [postTypeMode, form]);

  const onSubmitStandardPost = async (values: SocialFeedPostFormSchemaType) => {
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
        parentId: values.parentPostId?.toString() ?? "",
        token,
        userRealmId: userRealmId ?? "",
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

  if (!isDisplayed) {
    return null;
  }

  return (
    <div
      ref={formContainerRef}
      className="flex justify-center w-full transition-all duration-300 bg-secondary/80"
    >
      <div className="w-full">
        {postTypeMode === "POLL" ? (
          <PollPostForm
            orgType={orgType}
            orgId={orgId}
            postTypeMode={postTypeMode}
            setPostTypeMode={setPostTypeMode}
            form={form}
          />
        ) : (
          <StandardPostForm
            postTypeMode={postTypeMode}
            setPostTypeMode={setPostTypeMode}
            form={form}
            onSubmit={onSubmitStandardPost}
            isLoading={isPending}
          />
        )}
      </div>
    </div>
  );
};

export default SocialFeedForm;
