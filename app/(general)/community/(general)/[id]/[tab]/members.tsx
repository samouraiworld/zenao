"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import Heading from "@/components/widgets/texts/heading";
import CommunityMemberCard from "@/components/user/community-member-card";
import { communityUsersWithRoles } from "@/lib/queries/community";
import EmptyList from "@/components/widgets/lists/empty-list";
import CommunityMemberCardSkeleton from "@/components/community/community-member-card-skeleton";

type CommunityMembersProps = {
  communityId: string;
};

function CommunityMembers({ communityId }: CommunityMembersProps) {
  const t = useTranslations("");
  const { data: members = [] } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["member", "administrator"]),
  );

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        {members.length} {t("community.members")}
      </Heading>

      {members.length === 0 ? (
        <div className="space-y-4">
          <EmptyList
            title={t("no-members-title")}
            description={t("no-members-description")}
          />
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {members.map((member) => (
            <Suspense
              fallback={<CommunityMemberCardSkeleton />}
              key={member.entityId}
            >
              <Link href={`/profile/${member.entityId}`} className="block">
                <CommunityMemberCard
                  communityId={communityId}
                  userId={member.entityId}
                />
              </Link>
            </Suspense>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityMembers;
