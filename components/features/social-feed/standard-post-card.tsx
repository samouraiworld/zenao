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
import { useEditStandardPost, useReactPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { eventUserRoles } from "@/lib/queries/event-users";

export function StandardPostCard({
  eventId,
  post,
  canReply,
  onDeleteSuccess,
}: {
  eventId: string;
  post: StandardPostView;
  canReply?: boolean;
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
  const { editPost, isPending } = useEditStandardPost();
  const { reactPost, isPending: isReacting } = useReactPost();

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
    try {
      if (values.kind === "POLL") {
        throw new Error("invalid kind");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid token");
      }

      await editPost({
        content: values.content,
        eventId,
        tags: [],
        postId: post.post.localPostId.toString(10),
        token,
        userAddress: userAddress || "",
      });

      setEditMode(false);
    } catch (error) {
      captureException(error);
    }
  };

  const onReactionChange = async (icon: string) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing token");
      }
      await reactPost({
        token,
        userAddress: userAddress || "",
        postId: post.post.localPostId.toString(10),
        icon,
        eventId,
        parentId: "",
      });
    } catch (error) {
      console.error("error", error);
    }
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
            isLoading={isPending}
          />
        ) : (
          <MarkdownPreview markdownString={standardPost.content} />
        )}
      </PostCardLayout>
    </div>
  );
}
