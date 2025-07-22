"use client";

import { Url } from "next/dist/shared/lib/router/router";
import React, { ReactNode } from "react";
import { Hash, MapPin, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "../features/user/user";
import { PostMenu } from "../features/social-feed/post-menu";
import PostReactions from "./post-reactions";
import { Card } from "@/components/widgets/cards/card";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";
import { DateTimeText } from "@/components/widgets/date-time-text";
import Text from "@/components/widgets/texts/text";
import { GnoProfile } from "@/lib/queries/profile";
import { EventUserRole } from "@/lib/queries/event-users";
import { Button } from "@/components/shadcn/button";

type PostCardLayoutProps = {
  post: PostView;
  eventId: string;
  createdBy: GnoProfile | null;
  children: ReactNode;
  canReply?: boolean;
  editMode?: boolean;
  gnowebHref?: Url;
  parentId?: string;
  userRoles?: EventUserRole[];
  onEditModeChange?: (editMode: boolean) => void;
  onDeleteSuccess?: () => void;
  onReactionChange?: (icon: string) => void | Promise<void>;
  isReacting?: boolean;
};

export function PostCardLayout({
  post,
  eventId,
  createdBy,
  gnowebHref,
  children,
  canReply,
  editMode,
  parentId = "",
  userRoles = [],
  onEditModeChange,
  onDeleteSuccess,
  onReactionChange,
  isReacting,
}: PostCardLayoutProps) {
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
        {editMode ? (
          <div className="flex items-center max-sm:absolute max-sm:right-0 max-sm:top-0">
            <Button
              variant="ghost"
              className="px-2"
              title="Cancel modification"
              onClick={() => onEditModeChange?.(false)}
            >
              <X />
            </Button>
          </div>
        ) : (
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
                parentId={parentId}
                author={post.post.author}
                onDeleteSuccess={onDeleteSuccess}
                onEdit={() => onEditModeChange?.(true)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="my-1">{children}</div>

      {!editMode && (
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

          <PostReactions
            reactions={post.reactions}
            canReact={
              userRoles.includes("participant") ||
              userRoles.includes("organizer")
            }
            isPending={isReacting}
            onReactionChange={onReactionChange}
          />
        </div>
      )}
    </Card>
  );
}
