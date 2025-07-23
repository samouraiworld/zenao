"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useToast } from "@/app/hooks/use-toast";
import { useDeletePost, useReactPost } from "@/lib/mutations/social-feed";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";
import { PollPostView } from "@/lib/social-feed";
import { DEFAULT_FEED_POSTS_LIMIT, feedPosts } from "@/lib/queries/social-feed";
import { PollsList } from "@/components/social-feed/polls-list";
import EmptyList from "@/components/widgets/lists/empty-list";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";

type EventPollsProps = {
  eventId: string;
};

function EventPolls({ eventId }: EventPollsProps) {
  const t = useTranslations("event-feed");
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );

  const {
    data: pollsPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    feedPosts(eventId, DEFAULT_FEED_POSTS_LIMIT, "poll", userAddress || ""),
  );

  const polls = useMemo(
    () =>
      pollsPages.pages.flat().filter((post): post is PollPostView => {
        return (
          post.post?.post.case === "link" && post.post?.tags?.includes("poll")
        );
      }),
    [pollsPages],
  );

  const { reactPost, isPending: isReacting } = useReactPost();
  const { deletePost, isPending: isDeleting } = useDeletePost();

  const onReactionChange = async (postId: string, icon: string) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing token");
      }
      await reactPost({
        token,
        userAddress: userAddress || "",
        postId,
        icon,
        eventId,
        parentId: "",
      });
    } catch (error) {
      console.error("error", error);
    }
  };

  const onDelete = async (postId: string, parentId?: string) => {
    const token = await getToken();

    try {
      if (!token || !userAddress) {
        throw new Error("not authenticated");
      }

      await deletePost({
        eventId,
        postId,
        parentId,
        token,
        userAddress,
      });

      toast({
        title: t("toast-delete-post-success"),
      });
    } catch (error) {
      if (error instanceof Error) {
        captureException(error);
        toast({
          variant: "destructive",
          title: t("toast-delete-post-error"),
        });
      }
    }
  };

  return (
    <>
      <div className="space-y-4">
        {!polls.length ? (
          <EmptyList
            title={t("no-polls-title")}
            description={t("no-polls-description")}
          />
        ) : (
          <PollsList
            polls={polls}
            userAddress={userAddress}
            onReactionChange={onReactionChange}
            canInteract={
              roles.includes("organizer") || roles.includes("participant")
            }
            onDelete={onDelete}
            replyHrefFormatter={(postId) =>
              `/event/${eventId}/feed/post/${postId}`
            }
            canReply
            isReacting={isReacting}
            isDeleting={isDeleting}
          />
        )}
      </div>
      <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={polls}
          noMoreLabel={t("event-feed.no-more-posts")}
        />
      </div>
    </>
  );
}

export default EventPolls;
