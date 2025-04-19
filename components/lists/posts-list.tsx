"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Text from "../texts/text";
import { PostCardSkeleton } from "../loader/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { StandardPostView } from "@/lib/social-feed";

function EmptyPostsList() {
  const t = useTranslations("event-feed");

  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">{t("no-posts-title")}</Text>
      <Text size="sm" variant="secondary">
        {t("no-posts-description")}
      </Text>
    </div>
  );
}

export function PostsList({
  eventId,
  list,
}: {
  eventId: string;
  list: StandardPostView[];
}) {
  return (
    <div className="space-y-4">
      {!list.length ? (
        <EmptyPostsList />
      ) : (
        list.map((post) => (
          <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
            <StandardPostCard eventId={eventId} post={post} />
          </Suspense>
        ))
      )}
    </div>
  );
}
