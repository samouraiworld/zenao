"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import {
  communitiesList,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import CommunityCard from "@/components/community/community-card";
import CommunityCardSkeleton from "@/components/community/community-card-skeleton";

function CommunitiesListPage() {
  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesList(DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  return (
    <div className="flex flex-col gap-2">
      {communities.map((community) => {
        return (
          <Link key={community.id} href={`/community/${community.id}`}>
            <Suspense fallback={<CommunityCardSkeleton />}>
              <CommunityCard id={community.id} community={community} />
            </Suspense>
          </Link>
        );
      })}
    </div>
  );
}

export default CommunitiesListPage;
