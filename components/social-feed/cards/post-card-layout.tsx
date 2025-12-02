"use client";

import { Url } from "next/dist/shared/lib/router/router";
import React, { ReactNode } from "react";
import { Hash, MapPin, MessageCircle, Pin, X } from "lucide-react";
import Link from "next/link";
import { PostMenu } from "../post-menu";
import PostReactions from "../post-reactions";
import { Card } from "@/components/widgets/cards/card";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";
import { DateTimeText } from "@/components/widgets/date-time-text";
import Text from "@/components/widgets/texts/text";
import { UserProfile } from "@/lib/queries/profile";
import { Button } from "@/components/shadcn/button";
import { UserAvatar } from "@/components/features/user/user";
import { derivePkgAddr } from "@/lib/gno";

type PostCardLayoutProps = {
  post: PostView;
  createdBy: UserProfile | null;
  children: ReactNode;
  isOwner?: boolean;
  canReply?: boolean;
  replyHref?: string;
  editMode?: boolean;
  gnowebHref?: Url;
  parentId?: string;
  canEdit?: boolean;
  canInteract?: boolean;
  canPin?: boolean;
  pinned?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
  onDelete?: (parentId?: string) => void | Promise<void>;
  onReactionChange?: (icon: string) => void | Promise<void>;
  onPinToggle?: () => void | Promise<void>;
  isReacting?: boolean;
  isDeleting?: boolean;
};

export function PostCardLayout({
  post,
  createdBy,
  gnowebHref,
  children,
  isOwner,
  canReply,
  replyHref,
  editMode,
  parentId = "",
  canEdit,
  canInteract,
  canPin,
  pinned,
  onPinToggle,
  onEditModeChange,
  onDelete,
  onReactionChange,
  isReacting,
  isDeleting,
}: PostCardLayoutProps) {
  if (!post.post) {
    return null;
  }

  return (
    <Card className="w-full flex flex-col gap-2">
      {pinned && (
        <div className="flex gap-1 items-center">
          <Pin className="w-4 h-4 text-secondary-color" />
          <Text className="text-sm font-medium" variant="secondary">
            Pinned Post
          </Text>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start gap-2 relative">
        <div className="w-full flex flex-row items-center gap-3">
          <Link href={`/profile/${derivePkgAddr(post.post.author)}`}>
            <UserAvatar
              className="flex ring-2 ring-background/80 cursor-pointer hover:scale-110 transition-transform ease-out"
              realmId={post.post.author}
              size="sm"
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
                isOwner={isOwner}
                onDelete={async () => await onDelete?.(parentId)}
                isDeleting={isDeleting}
                canEdit={canEdit}
                onEdit={() => onEditModeChange?.(true)}
                canPin={canPin}
                onPinToggle={() => onPinToggle?.()}
                pinned={pinned}
              />
            </div>
          </div>
        )}
      </div>

      <div className="my-1">{children}</div>

      {!editMode && (
        <div className="flex sm:flex-row sm:items-center gap-2">
          {canReply && replyHref && (
            <Link href={replyHref}>
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
            canReact={canInteract}
            isPending={isReacting}
            onReactionChange={onReactionChange}
          />
        </div>
      )}
    </Card>
  );
}
