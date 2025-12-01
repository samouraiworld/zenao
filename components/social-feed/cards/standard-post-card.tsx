"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { StandardPostForm } from "../forms/standard-post-form";
import { PostCardLayout } from "./post-card-layout";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { cford32Encode } from "@/lib/cford32";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";
import { SocialFeedPostFormSchemaType } from "@/types/schemas";

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
  canPin,
  pinned,
  onPinToggle,
}: {
  isOwner?: boolean;
  canInteract?: boolean;
  post: StandardPostView;
  canReply?: boolean;
  replyHref?: string;
  onEdit?: (values: SocialFeedPostFormSchemaType) => void | Promise<void>;
  isEditing?: boolean;
  innerEditForm?: boolean;
  editMode: boolean;
  onEditModeChange?: (editMode: boolean) => void;
  onReactionChange?: (icon: string) => void | Promise<void>;
  isReacting?: boolean;
  canPin?: boolean;
  pinned?: boolean;
  onPinToggle?: () => void | Promise<void>;
  onDelete?: (parentId?: string) => void;
  isDeleting?: boolean;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

  const standardPost = post.post.post.value;

  const form = useForm<SocialFeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      kind: "STANDARD_POST",
      content: standardPost.content,
    },
  });

  const onSubmit = async (values: SocialFeedPostFormSchemaType) => {
    await onEdit?.(values);
  };

  return (
    <div className="flex flex-col gap-1">
      <PostCardLayout
        post={post}
        createdBy={createdBy}
        gnowebHref={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/social_feed:post/${cford32Encode(post.post.localPostId, 7)}`}
        canReply={canReply}
        replyHref={replyHref}
        canInteract={canInteract}
        onDelete={onDelete}
        canEdit
        canPin={canPin}
        pinned={pinned}
        onPinToggle={onPinToggle}
        editMode={editMode}
        onEditModeChange={onEditModeChange}
        onReactionChange={onReactionChange}
        isReacting={isReacting}
        isDeleting={isDeleting}
        isOwner={isOwner}
      >
        {innerEditForm && editMode ? (
          <StandardPostForm
            postTypeMode="STANDARD_POST"
            form={form}
            onSubmit={onSubmit}
            setPostTypeMode={() => {
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
