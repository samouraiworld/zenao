"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { communityAdministratorsQuery } from "@/lib/queries/community";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";

export const CommunityEditAdminButton = ({
  communityId,
}: {
  communityId: string;
}) => {
  const t = useTranslations("community-edit-form");
  const { getToken } = useAuth();
  const { user } = useUser();

  const { data: administrators } = useSuspenseQuery(
    communityAdministratorsQuery(getToken, communityId),
  );
  const email = user?.emailAddresses[0]?.emailAddress;
  const isAdmin = email && administrators.includes(email);

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
