"use client";

import React, { ReactNode } from "react";
import { Hash, MapPin } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/cards/Card";
import { UserAvatar } from "@/components/common/user";
import { PostView, ReactionView } from "@/app/gen/feeds/v1/feeds_pb";
import { DateTimeText } from "@/components/common/date-time-text";
import Text from "@/components/texts/text";
import { cn } from "@/lib/tailwind";

export function PostCardLayout({
  post,
  children,
}: {
  post: PostView;
  children: ReactNode;
}) {
  if (!post.post) {
    return null;
  }
  return (
    <Card className="w-full flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-start gap-2">
        <div className="w-full flex flex-row items-center gap-3">
          {/*TODO: On click author avatar*/}
          <Link href={`/profile/${post.post.author}`}>
            <UserAvatar
              className="flex ring-2 ring-background/80 cursor-pointer hover:scale-110 transition-transform ease-out"
              address={post.post.author}
            />
          </Link>

          <div className="flex flex-col">
            <Link href={`/profile/${post.post.author}`}>
              <Text className="text-sm">{post.post.author}</Text>
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

              {post.post.tags.map((tag, index) => (
                // TODO: on click tag

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
            // TODO: on click location

            <div className="flex flex-row items-center gap-1 cursor-pointer hover:opacity-50">
              <MapPin size={14} color="hsl(var(--secondary-color))" />
              <Text className="text-sm" variant="secondary">
                Location
              </Text>
            </div>
          )}
        </div>
      </div>

      <div className="my-1">{children}</div>

      <div className="flex flex-col justify-between sm:flex-row sm:items-center gap-2">
        <Reactions reactions={post.reactions} />
        {/* <Text className="text-sm">TODO: Some actions here? </Text> */}
      </div>
    </Card>
  );
}

function Reactions({ reactions }: { reactions: ReactionView[] }) {
  // TODO: Handle display if a lot of different icons

  return (
    <div className="flex flex-row gap-0.5">
      {reactions.map((reaction) => (
        <div
          onClick={() => {
            // TODO: Do react to post
          }}
          className={cn(
            "flex flex-row items-center py-0.5 pl-1 pr-2 rounded-full gap-0.5 cursor-pointer hover:bg-neutral-700",
            reaction.userHasVoted && "border-[1px] border-neutral-700",
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
  );
}
