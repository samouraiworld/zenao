"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Link from "next/link";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import {
  communitiesList,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import Heading from "@/components/widgets/texts/heading";
import { Card } from "@/components/widgets/cards/card";
import { Web3Image } from "@/components/widgets/images/web3-image";

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

      <div className="space-y-4">
        {communities.map((community) => {
          const communityId = communityIdFromPkgPath(community.pkgPath);
          return (
            <Link key={communityId} href={`/community/${communityId}`}>
              <Card className="flex flex-col gap-2 bg-secondary/50 hover:bg-secondary/100">
                <div className="flex gap-4">
                  <div className="sm:w-2/12 sm:h-2/12 w-3/12 h-3/12">
                    <AspectRatio ratio={1 / 1}>
                      <Web3Image
                        src={community.avatarUri}
                        alt="Profile picture"
                        priority
                        fetchPriority="high"
                        fill
                        sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"
                        className="flex w-full rounded-xl md:rounded self-center object-cover"
                      />
                    </AspectRatio>
                  </div>
                  <div>
                    <Heading level={3} className="text-lg sm:text-2xl">
                      {community.displayName}
                    </Heading>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default CommunitiesListPage;
