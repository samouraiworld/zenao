"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { communityUserRoles } from "@/lib/queries/community";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";
import GuardedPostCommentForm from "@/components/social-feed/forms/guarded-post-comment-form";

interface CommunityPostCommentFormProps {
  communityId: string;
  userRealmId: string;
  form: UseFormReturn<SocialFeedPostFormSchemaType>;
  onSubmit: (values: SocialFeedPostFormSchemaType) => Promise<void>;
  isPending: boolean;
}

export default function CommunityPostCommentForm({
  communityId,
  userRealmId,
  form,
  onSubmit,
  isPending,
}: CommunityPostCommentFormProps) {
  const { data: roles } = useSuspenseQuery(
    communityUserRoles(communityId, userRealmId),
  );

  return (
    <GuardedPostCommentForm
      isAllowed={roles.includes("administrator") || roles.includes("member")}
      onSubmit={onSubmit}
      form={form}
      isPending={isPending}
    />
  );
}
