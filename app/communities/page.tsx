"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  communitiesList,
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

  return <div>page</div>;
}

export default CommunitiesListPage;
