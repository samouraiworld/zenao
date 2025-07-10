import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { PostCardLayout } from "@/components/features/social-feed/post-card-layout";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { profileOptions } from "@/lib/queries/profile";
import {
  DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  feedPostsChildren,
} from "@/lib/queries/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { isStandardPost, StandardPostView } from "@/lib/social-feed";

function PostComment({
  eventId,
  parentId,
  comment,
}: {
  eventId: string;
  parentId: string;
  comment: StandardPostView;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(comment.post.author),
  );
  const [editMode, setEditMode] = useState(false);

  const standardPost = comment.post.post.value;

  return (
    <PostCardLayout
      key={comment.post.localPostId}
      eventId={eventId}
      post={comment}
      createdBy={createdBy}
      parentId={parentId}
      editMode={editMode}
      onEditModeChange={setEditMode}
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

  return (
    <div className="space-y-1">
      {comments.map((comment) => {
        return (
          <PostComment
            key={comment.post.localPostId}
            eventId={eventId}
            parentId={parentId}
            comment={comment}
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
