"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card } from "../widgets/cards/card";
import { AspectRatio } from "../shadcn/aspect-ratio";
import { Web3Image } from "../widgets/images/web3-image";
import Heading from "../widgets/texts/heading";
import Text from "../widgets/texts/text";
import UsersAvatarsPreview from "../user/users-avatars-preview";
import UsersNamesPreview from "../user/users-names-preview";
import { CommunityInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { communityUsersWithRoles } from "@/lib/queries/community";

type CommunityCardProps = {
  id: string;
  community: CommunityInfo;
};

function CommunityCard({ id, community }: CommunityCardProps) {
  const t = useTranslations("community-card");
  const { data: members } = useSuspenseQuery(
    communityUsersWithRoles(id, ["member"]),
  );
  const memberAddresses = useMemo(
    () => members.map((m) => m.address),
    [members],
  );

  return (
    <Card className="flex flex-col gap-2 bg-secondary/50 hover:bg-secondary/100">
      <div className="flex gap-4">
        <div className="min-w-[128px]">
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
        <div className="flex flex-col gap-2">
          <Heading level={3} className="text-lg sm:text-2xl">
            {community.displayName}
          </Heading>
          <Text className="text-xs md:text-sm text-ellipsis line-clamp-2 text-secondary-color">
            {community.description}
          </Text>

          <div className="flex flex-col gap-2">
            {/* 6 because we decide to show the first 6 participants avatars as preview */}
            <UsersAvatarsPreview
              usersAddresses={
                memberAddresses.length > 6
                  ? memberAddresses.slice(0, 6)
                  : memberAddresses
              }
            />
            <Text className="text-xs md:text-sm text-secondary-color">
              {t("members", { count: memberAddresses.length })}
            </Text>
            {memberAddresses.length > 3 && (
              <UsersNamesPreview usersAddresses={memberAddresses} />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CommunityCard;
