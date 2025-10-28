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
import { addressFromRealmId } from "@/lib/gno";

type CommunityMembersProps = {
  communityId: string;
};

function CommunityMembers({ communityId }: CommunityMembersProps) {
  const t = useTranslations("");
  const { data: members = [] } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["member", "administrator"]),
  );

  const membersProfiles = useSuspenseQueries({
    queries: members.map((m) => profileOptions(m.address)),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<GnoProfile, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem) => elem.data),
  });

  const membersWithRoles = membersProfiles.map((profile, idx) => ({
    ...profile,
    realmId:
      members.find((m) => addressFromRealmId(m.address) === profile.address)
        ?.address || "",
    roles: members[idx].roles,
  }));

  console.log(membersWithRoles);

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        {membersWithRoles.length} {t("community.members")}
      </Heading>

      {membersWithRoles.length === 0 ? (
        <div className="space-y-4">
          <EmptyList
            title={t("no-members-title")}
            description={t("no-members-description")}
          />
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {membersWithRoles.map((member) => (
            <Link
              key={member.address}
              href={`/profile/${member.realmId}`}
              className="block"
            >
              <CommunityMemberCard
                address={member.realmId}
                displayName={member.displayName}
                bio={member.bio}
                roles={member.roles}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityMembers;
