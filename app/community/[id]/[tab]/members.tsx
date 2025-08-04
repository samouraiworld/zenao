"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import Heading from "@/components/widgets/texts/heading";
import CommunityMemberCard from "@/components/user/community-member-card";
import { GnoProfile } from "@/lib/queries/profile";

function CommunityMembers() {
  const t = useTranslations("");

  const profiles: (GnoProfile & { roles: string[] })[] = [
    {
      address: "g1tv52zehm3q7zk6gvycexkx32qgd255dy2qkhnw",
      avatarUri: "test",
      displayName: "Mio",
      bio: "Zenao managed user",
      roles: [],
    },
  ];

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        {profiles.length} {t("community.members")}
      </Heading>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {profiles.map((profile) => (
          <Link key={profile.address} href="#" className="block">
            <CommunityMemberCard
              address={profile.address}
              avatarUri={profile.avatarUri}
              displayName={profile.displayName}
              description={profile.bio}
              roles={profile.roles}
            />
          </Link>
        ))}
      </div>
    </div>
  );
  {
    /* <div className="space-y-4">
        <EmptyList
          title={t("no-members-title")}
          description={t("no-members-description")}
        />
      </div> */
  }
  {
    /* <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={members}
          noMoreLabel={t("no-more-members")}
        />
      </div> */
  }
}

export default CommunityMembers;
