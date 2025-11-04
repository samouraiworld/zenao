"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import { eventUserRoles } from "@/lib/queries/event-users";
import GuardedPostCommentForm from "@/components/social-feed/forms/guarded-post-comment-form";

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
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  return (
    <GuardedPostCommentForm
      isAllowed={roles.includes("organizer") || roles.includes("participant")}
      onSubmit={onSubmit}
      form={form}
      isPending={isPending}
    />
  );
}
