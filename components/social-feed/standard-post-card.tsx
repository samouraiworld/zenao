"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { StandardPostForm } from "../event-feed-form/standard-post-form";
import { PostCardLayout } from "@/components/social-feed/post-card-layout";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { FeedPostFormSchemaType } from "@/types/schemas";

export function StandardPostCard({
  post,
  isOwner,
  canInteract,
  canReply,
  replyHref,
  onEdit,
  isEditing,
  editMode,
  innerEditForm,
  onEditModeChange,
  onReactionChange,
  isReacting,
  onDelete,
  isDeleting,
}: {
  isOwner?: boolean;
  canInteract?: boolean;
  post: StandardPostView;
  canReply?: boolean;
  replyHref?: string;
  onEdit?: (values: FeedPostFormSchemaType) => void | Promise<void>;
  isEditing?: boolean;
  innerEditForm?: boolean;
  editMode: boolean;
  onEditModeChange?: (editMode: boolean) => void;
  onReactionChange?: (icon: string) => void | Promise<void>;
  isReacting?: boolean;
  onDelete?: (parentId?: string) => void;
  isDeleting?: boolean;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

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
  };

  return (
    <div className="flex flex-col gap-1">
      <PostCardLayout
        post={post}
        createdBy={createdBy}
        gnowebHref={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/social_feed:post/${post.post.localPostId.toString(32).padStart(7, "0")}`}
        canReply={canReply}
        replyHref={replyHref}
        canInteract={canInteract}
        onDelete={onDelete}
        canEdit
        editMode={editMode}
        onEditModeChange={onEditModeChange}
        onReactionChange={onReactionChange}
        isReacting={isReacting}
        isDeleting={isDeleting}
        isOwner={isOwner}
      >
        {innerEditForm && editMode ? (
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
