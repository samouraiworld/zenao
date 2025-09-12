"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import Heading from "@/components/widgets/texts/heading";
import CommunityMemberCard from "@/components/user/community-member-card";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";
import { communityUsersWithRoles } from "@/lib/queries/community";
import EmptyList from "@/components/widgets/lists/empty-list";

type CommunityMembersProps = {
  communityId: string;
};

function CommunityMembers({ communityId }: CommunityMembersProps) {
  const t = useTranslations("");
  const { data: membersAddresses } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["member"]),
  );

  const membersProfiles = useSuspenseQueries({
    queries: membersAddresses.map((m) => profileOptions(m.address)),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<GnoProfile, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem) => elem.data),
  });

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        {membersProfiles.length} {t("community.members")}
      </Heading>

      {membersProfiles.length === 0 ? (
        <div className="space-y-4">
          <EmptyList
            title={t("no-members-title")}
            description={t("no-members-description")}
          />
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {membersProfiles.map((profile) => (
            <Link
              key={profile.address}
              href={`/profile/${profile.address}`}
              className="block"
            >
              <CommunityMemberCard
                address={profile.address}
                avatarUri={profile.avatarUri}
                displayName={profile.displayName}
                roles={["member"]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityMembers;
