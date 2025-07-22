"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { StandardPostForm } from "./event-feed-form/standard-post-form";
import { PostCardLayout } from "@/components/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { userAddressOptions } from "@/lib/queries/user";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { eventUserRoles } from "@/lib/queries/event-users";

export function StandardPostCard({
  // eventId,
  post,
  canReply,
  onEdit,
  isEditing,
  onReactionChange,
  isReacting,
  onDeleteSuccess,
}: {
  // eventId: string;
  post: StandardPostView;
  canReply?: boolean;
  onEdit?: (values: FeedPostFormSchemaType) => void | Promise<void>;
  isEditing?: boolean;
  onReactionChange?: (icon: string) => void | Promise<void>;
  isReacting?: boolean;
  onDeleteSuccess?: () => void;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

  const [editMode, setEditMode] = useState(false);

  const standardPost = post.post.post.value;

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      kind: "STANDARD_POST",
      content: standardPost.content,
    },
  });

  const onSubmit = async (values: FeedPostFormSchemaType) => {
    await onEdit?.(values);
    setEditMode(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <PostCardLayout
        eventId={eventId}
        post={post}
        createdBy={createdBy}
        gnowebHref={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/social_feed:post/${post.post.localPostId.toString(32).padStart(7, "0")}`}
        canReply={canReply}
        userRoles={roles}
        onDeleteSuccess={onDeleteSuccess}
        editMode={editMode}
        onEditModeChange={setEditMode}
        onReactionChange={onReactionChange}
        isReacting={isReacting}
      >
        {editMode ? (
          <StandardPostForm
            feedInputMode="STANDARD_POST"
            form={form}
            onSubmit={onSubmit}
            setFeedInputMode={() => {
              console.log("not available");
            }}
            isEditing
            isLoading={isEditing}
          />
        ) : (
          <MarkdownPreview markdownString={standardPost.content} />
        )}
      </PostCardLayout>
    </div>
  );
}
