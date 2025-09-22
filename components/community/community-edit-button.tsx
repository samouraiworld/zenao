"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { communityUserRoles } from "@/lib/queries/community";
import { userAddressOptions } from "@/lib/queries/user";

export const CommunityEditAdminButton = ({
  communityId,
}: {
  communityId: string;
}) => {
  const t = useTranslations("community-edit-form");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress),
  );
  const isAdmin = userRoles.includes("administrator");
  if (!isAdmin) return null;
  return (
    <div className="mt-4">
      <Link passHref href={`/community/edit/${communityId}`}>
        <ButtonWithChildren
          variant="outline"
          className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17]"
        >
          {t("edit-button")}
        </ButtonWithChildren>
      </Link>
    </div>
  );
};
