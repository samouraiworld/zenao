"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { zenaoClient } from "@/lib/zenao-client";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";

export const CommunityEditAdminButton: React.FC<{ communityId: string }> = ({
  communityId,
}) => {
  const t = useTranslations("community-edit-form");
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = await getToken();
        const email = user?.emailAddresses[0]?.emailAddress;

        if (!token || !userId || !email) return;

        const res = await zenaoClient.getCommunityAdministrators(
          { communityId },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.administrators.includes(email)) {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Failed to check admin status", err);
      } finally {
        setChecked(true);
      }
    };

    if (userId && user?.emailAddresses[0]?.emailAddress) {
      checkAdmin();
    }
  }, [communityId, getToken, userId, user]);

  if (!checked || !isAdmin) return null;

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
