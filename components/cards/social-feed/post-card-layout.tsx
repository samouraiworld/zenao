"use client";

import { Url } from "next/dist/shared/lib/router/router";
import React, { ReactNode, useMemo } from "react";
import { Hash, MapPin, MessageCircle, Smile } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { PostMenu } from "../menu/post-menu";
import { Card } from "@/components/cards/card";
import { UserAvatar } from "@/components/common/user";
import { PostView, ReactionView } from "@/app/gen/feeds/v1/feeds_pb";
import { DateTimeText } from "@/components/common/date-time-text";
import Text from "@/components/texts/text";
import { cn } from "@/lib/tailwind";
import { GnoProfile } from "@/lib/queries/profile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { useReactPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";
import { Button } from "@/components/shadcn/button";

export function PostCardLayout({
  post,
  eventId,
  createdBy,
  gnowebHref,
  children,
  canReply,
  parentId = "",
  onDeleteSuccess,
}: {
  post: PostView;
  eventId: string;
  createdBy: GnoProfile | null;
  children: ReactNode;
  canReply?: boolean;
  gnowebHref?: Url;
  parentId?: string;
  onDeleteSuccess?: () => void;
}) {
  if (!post.post) {
    return null;
  }
  return (
    <Card className="w-full flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-start gap-2 relative">
        <div className="w-full flex flex-row items-center gap-3">
          <Link href={`/profile/${post.post.author}`}>
            <UserAvatar
              className="flex ring-2 ring-background/80 cursor-pointer hover:scale-110 transition-transform ease-out"
              address={post.post.author}
            />
          </Link>

          <div className="flex flex-col">
            <Link href={`/profile/${post.post.author}`}>
              <Text className="text-sm">{createdBy?.displayName}</Text>
            </Link>
            <DateTimeText
              variant="secondary"
              className="text-xs"
              datetime={post.post.createdAt}
            />
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:justify-end">
          {!!post.post.tags.length && (
            <div className="flex flex-row items-center gap-2">
              {/*TODO: Handle display if a lot of tags*/}

              {post.post.tags
                .filter((tag) => tag !== "poll")
                .map((tag, index) => (
                  <div
                    className="flex flex-row items-center gap-0.5 cursor-pointer hover:opacity-50"
                    key={index}
                  >
                    <Hash size={14} color="hsl(var(--secondary-color))" />
                    <Text className="text-sm" variant="secondary">
                      {tag}
                    </Text>
                  </div>
                ))}
            </div>
          )}
          {post.post.loc && (
            <div className="flex flex-row items-center gap-1 cursor-pointer hover:opacity-50">
              <MapPin size={14} color="hsl(var(--secondary-color))" />
              <Text className="text-sm" variant="secondary">
                Location
              </Text>
            </div>
          )}
          <div className="flex items-center max-sm:absolute max-sm:right-0 max-sm:top-0">
            <PostMenu
              gnowebHref={gnowebHref}
              eventId={eventId}
              postId={post.post.localPostId}
              author={post.post.author}
              onDeleteSuccess={onDeleteSuccess}
            />
          </div>
        </div>
      </div>

      <div className="my-1">{children}</div>

      <div className="flex sm:flex-row sm:items-center gap-2">
        {canReply && (
          <Link href={`/event/${eventId}/feed/post/${post.post.localPostId}`}>
            <Button
              variant="outline"
              className={
                "rounded-full cursor-pointer h-8 px-2 gap-1 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
              }
              title="Show replies"
            >
              <MessageCircle size={16} color="hsl(var(--secondary-color))" />
              <span className="text-xs">{post.childrenCount}</span>
            </Button>
          </Link>
        )}
        <Reactions
          postId={post.post.localPostId}
          eventId={eventId}
          reactions={post.reactions}
          parentId={parentId}
        />
      </div>
    </Card>
  );
}

function Reactions({
  postId,
  eventId,
  reactions,
  parentId,
}: {
  postId: bigint;
  eventId: string;
  reactions: ReactionView[];
  parentId: string;
}) {
  const { resolvedTheme } = useTheme();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );
  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const { reactPost, isPending } = useReactPost();
  const onReactionChange = async (icon: string) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing token");
      }
      await reactPost({
        token,
        userAddress: userAddress || "",
        postId: postId.toString(),
        icon,
        eventId,
        parentId,
      });
    } catch (error) {
      console.error("error", error);
    }
  };

  return (
    <div className="flex flex-row gap-2 overflow-auto">
      {(isOrganizer || isParticipant) && (
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="reaction-btn rounded-full cursor-pointer size-8 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            >
              <Smile size={16} color="hsl(var(--secondary-color))" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit bg-transparent p-0 border-none transition-all">
            <EmojiPicker
              theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
              onEmojiClick={(choice) => {
                if (isPending) return;
                onReactionChange(choice.emoji);
                setEmojiPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="flex flex-row gap-1 grow overflow-auto">
        {reactions
          .sort((a, b) => b.count - a.count)
          .map((reaction) => (
            <Button
              variant="outline"
              onClick={() => {
                if (isPending) return;
                if (isOrganizer || isParticipant)
                  onReactionChange(reaction.icon);
              }}
              className={cn(
                "flex flex-row items-center h-8 px-2 rounded-full gap-1 dark:bg-neutral-800/50 dark:hover:bg-neutral-800",
                reaction.userHasVoted && "border-[#EC7E17]",
              )}
              key={reaction.icon}
            >
              <Text className="text-sm">{reaction.icon}</Text>
              <Text variant="secondary" className="text-sm">
                {reaction.count}
              </Text>
            </Button>
          ))}
      </div>
    </div>
  );
}
