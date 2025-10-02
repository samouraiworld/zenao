"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Link from "next/link";
import {
  communitiesList,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import Heading from "@/components/widgets/texts/heading";
import CommunityCard from "@/components/community/community-card";

function CommunitiesListPage() {
  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesList(DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  return (
    <div className="flex flex-col gap-12 mb-3">
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:justify-between md:items-center">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Heading level={1} size="4xl" className="truncate">
            Communities
          </Heading>
          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/communityreg`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {communities.map((community) => {
          const communityId = communityIdFromPkgPath(community.pkgPath);
          return (
            <Link key={communityId} href={`/community/${communityId}`}>
              <CommunityCard id={communityId} community={community} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default CommunitiesListPage;
