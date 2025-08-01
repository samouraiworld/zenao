"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Link from "next/link";
import {
  communitiesList,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";

function CommunitiesListPage() {
  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesList(DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  console.log(communities);

  return (
    <div>
      {communities.map((community) => {
        const communityId = communityIdFromPkgPath(community.pkgPath);
        return (
          <Link key={communityId} href={`/community/${communityId}`}>
            {community.displayName}
          </Link>
        );
      })}
    </div>
  );
}

export default CommunitiesListPage;
