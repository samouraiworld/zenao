"use client";

import React, { ReactNode } from "react";
import { Card } from "@/components/cards/Card";
import { UserAvatar } from "@/components/common/user";
import { Post } from "@/app/gen/feeds/v1/feeds_pb";
import { DateTimeText } from "@/components/common/date-time-text";
import Text from "@/components/texts/text";

export function PostCardLayout({
  post,
  children,
}: {
  post: Post;
  children: ReactNode;
}) {
  return (
    <Card className="w-full flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-start gap-2">
        <div className="w-full flex flex-row items-center gap-3">
          <UserAvatar
            className="flex ring-2 ring-background/80"
            address={post.author}
          />
          <div className="flex flex-col">
            <Text className="text-sm">{post.author}</Text>
            <DateTimeText
              variant="secondary"
              className="text-xs"
              datetime={post.createdAt}
            />
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:justify-end">
          <Text className="text-sm" variant="secondary">
            TODO: Location here?
          </Text>
          <Text className="text-sm" variant="secondary">
            •
          </Text>
          <Text className="text-sm" variant="secondary">
            {post.tags.map((tag) => ` #${tag}`)}
          </Text>
        </div>
      </div>

      <div className="my-1">{children}</div>

      <div className="flex flex-col justify-between sm:flex-row sm:items-center gap-2">
        <Text className="text-sm" variant="secondary">
          TODO: Reactions here?
        </Text>
        <Text className="text-sm">TODO: Some actions here? </Text>
      </div>
    </Card>
  );
}
