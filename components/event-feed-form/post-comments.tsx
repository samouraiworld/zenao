import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { PostCardLayout } from "@/components/social-feed/post-card-layout";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { profileOptions } from "@/lib/queries/profile";
import {
  DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  feedPostsChildren,
} from "@/lib/queries/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { isStandardPost, StandardPostView } from "@/lib/social-feed";
import { eventUserRoles } from "@/lib/queries/event-users";
import useEventPostReactionHandler from "@/hooks/use-event-post-reaction-handler";
import useEventPostDeleteHandler from "@/hooks/use-event-post-delete-handler";
import { derivePkgAddr } from "@/lib/gno";

function PostComment({
  eventId,
  parentId,
  comment,
  onReactionChange,
  onDelete,
  isReacting,
  isDeleting,
}: {
  eventId: string;
  parentId: string;
  comment: StandardPostView;
  onReactionChange: (
    commentPostId: string,
    icon: string,
  ) => void | Promise<void>;
  onDelete: (commentPostId: string, parentId?: string) => void | Promise<void>;
  isReacting: boolean;
  isDeleting: boolean;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(comment.post.author),
  );
  const [editMode, setEditMode] = useState(false);

  const { data: _ } = useSuspenseQuery(eventUserRoles(eventId, userAddress));

  const standardPost = comment.post.post.value;

  return (
    <PostCardLayout
      key={comment.post.localPostId}
      post={comment}
      createdBy={createdBy}
      parentId={parentId}
      editMode={editMode}
      onEditModeChange={setEditMode}
      onReactionChange={async (icon) =>
        await onReactionChange(comment.post.localPostId.toString(10), icon)
      }
      isReacting={isReacting}
      canInteract
      isOwner={userAddress === comment.post.author}
      onDelete={async (parentId) =>
        await onDelete(comment.post.localPostId.toString(10), parentId)
      }
      isDeleting={isDeleting}
    >
      <MarkdownPreview markdownString={standardPost.content} />
    </PostCardLayout>
  );
}

export function PostComments({
  eventId,
  parentId,
}: {
  eventId: string;
  parentId: string;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const {
    data: commentsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPostsChildren(
      parentId,
      DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
      "",
      userAddress || "",
    ),
  );
  const comments = useMemo(() => {
    return commentsPages.pages.flat().filter((comment) => {
      return isStandardPost(comment);
    });
  }, [commentsPages]);

  const pkgPath = `gno.land/r/zenao/events/e${eventId}`;
  const feedId = `${derivePkgAddr(pkgPath)}:main`;

  const { onReactionChange, isReacting } = useEventPostReactionHandler(
    feedId,
    parentId,
  );
  const { onDelete, isDeleting } = useEventPostDeleteHandler(eventId);

  return (
    <div className="space-y-1">
      {comments.map((comment) => {
        return (
          <PostComment
            key={comment.post.localPostId}
            eventId={eventId}
            parentId={parentId}
            comment={comment}
            onReactionChange={onReactionChange}
            onDelete={onDelete}
            isReacting={isReacting}
            isDeleting={isDeleting}
          />
        );
      })}
      <LoaderMoreButton
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        page={comments}
        noMoreLabel={""}
      />
    </div>
  );
}
