import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import CommentPostCard from "../cards/comment-post-card";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import {
  DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  feedPostsChildren,
} from "@/lib/queries/social-feed";
import { userInfoOptions } from "@/lib/queries/user";
import { isStandardPost } from "@/lib/social-feed";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import { OrgType } from "@/lib/organization";

export default function CommentsList({
  orgType,
  orgId,
  parentId,
  feedId,
}: {
  orgType: OrgType;
  orgId: string;
  parentId: string;
  feedId: string;
}) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
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
      userRealmId,
    ),
  );
  const comments = useMemo(() => {
    return commentsPages.pages.flat().filter((comment) => {
      return isStandardPost(comment);
    });
  }, [commentsPages]);

  const { onReactionChange, isReacting } = useFeedPostReactionHandler(
    orgType,
    orgId,
    feedId,
    parentId,
  );
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(
    orgType,
    orgId,
    feedId,
  );

  return (
    <div className="space-y-1">
      {comments.map((comment) => {
        return (
          <CommentPostCard
            key={comment.post.localPostId}
            orgType={orgType}
            orgId={orgId}
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
