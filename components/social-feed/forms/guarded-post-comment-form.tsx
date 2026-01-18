"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { StandardPostForm } from "./standard-post-form";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";

interface GuardedPostCommentFormProps {
  isAllowed: boolean;
  onSubmit: (values: SocialFeedPostFormSchemaType) => Promise<void>;
  form: UseFormReturn<SocialFeedPostFormSchemaType>;
  isPending: boolean;
}

export default function GuardedPostCommentForm({
  isAllowed,
  onSubmit,
  form,
  isPending,
}: GuardedPostCommentFormProps) {
  const t = useTranslations("social-feed.standard-post-form");

  if (!isAllowed) {
    return (
      <div className="flex justify-center w-full">
        <div className="w-full">{t("comment-restricted-to-participants")}</div>
      </div>
    );
  }

  return (
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
  );
}
