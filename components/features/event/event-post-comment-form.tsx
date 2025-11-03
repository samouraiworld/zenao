"use client";
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { StandardPostForm } from "@/components/social-feed/forms/standard-post-form";
import { eventUserRoles } from "@/lib/queries/event-users";

interface EventPostCommentFormProps {
  eventId: string;
  userRealmId: string;
  form: UseFormReturn<SocialFeedPostFormSchemaType>;
  onSubmit: (values: SocialFeedPostFormSchemaType) => Promise<void>;
  isPending: boolean;
}

export default function EventPostCommentForm({
  eventId,
  userRealmId,
  form,
  onSubmit,
  isPending,
}: EventPostCommentFormProps) {
  const t = useTranslations("social-feed.standard-post-form");
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  if (!roles.includes("organizer") && !roles.includes("participant")) {
    <div className="flex justify-center w-full">
      <div className="w-full">{t("comment-restricted-to-participants")}</div>
    </div>;
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
