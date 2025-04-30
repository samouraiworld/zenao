"use client";

import { Url } from "next/dist/shared/lib/router/router";
import React, { ReactNode, useMemo } from "react";
import { Hash, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { PostMenu } from "../menu/post-menu";
import { Card } from "@/components/cards/Card";
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
import { getQueryClient } from "@/lib/get-query-client";
import { userAddressOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";

export function PostCardLayout({
  post,
  eventId,
  createdBy,
  gnowebHref,
  children,
}: {
  post: PostView;
  eventId: string;
  createdBy: GnoProfile | null;
  children: ReactNode;
  gnowebHref?: Url;
}) {
  if (!post.post) {
    return null;
  }
  return (
    <Card className="w-full flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-start gap-2">
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
          {gnowebHref && <PostMenu gnowebHref={gnowebHref} />}
        </div>
      </div>

      <div className="my-1">{children}</div>

      <div className="flex flex-col justify-between sm:flex-row sm:items-center gap-2">
        <Reactions
          postId={post.post.localPostId}
          eventId={eventId}
          reactions={post.reactions}
        />
      </div>
    </Card>
  );
}

function Reactions({
  postId,
  eventId,
  reactions,
}: {
  postId: bigint;
  eventId: string;
  reactions: ReactionView[];
}) {
  const queryClient = getQueryClient();
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
  const { reactPost, isPending } = useReactPost(queryClient);
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
      });
    } catch (error) {
      console.error("error", error);
    }
  };

  // TODO: Handle display if a lot of different icons
  return (
    <div className="flex flex-row gap-1 w-full">
      {(isOrganizer || isParticipant) && (
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <div className="reaction-btn flex flex-row items-center justify-center border-[1px] border-neutral-700 rounded-full gap-0.5 cursor-pointer hover:bg-neutral-700 h-8 w-8">
              <Plus size={16} color="hsl(var(--secondary-color))" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-fit bg-transparent p-0 pl-2 border-none transition-all">
            <EmojiPicker
              theme={Theme.DARK}
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
            <div
              onClick={() => {
                if (isPending) return;
                if (isOrganizer || isParticipant)
                  onReactionChange(reaction.icon);
              }}
              className={cn(
                "flex flex-row items-center h-8 px-2 rounded-full gap-1 cursor-default",
                reaction.userHasVoted && "border-[1px] border-neutral-700",
                (isOrganizer || isParticipant) &&
                  "hover:bg-neutral-700 cursor-pointer",
                !reaction.userHasVoted && "bg-neutral-800",
              )}
              key={reaction.icon}
            >
              <Text className="text-sm">{reaction.icon}</Text>
              <Text variant="secondary" className="text-sm">
                {reaction.count}
              </Text>
            </div>
          ))}
      </div>
    </div>
  );
}
