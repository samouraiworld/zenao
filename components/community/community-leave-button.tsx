"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "../shadcn/button";
import { useToast } from "@/hooks/use-toast";
import { useLeaveCommunity } from "@/lib/mutations/community-leave";
import { communityUserRoles } from "@/lib/queries/community";
import { userAddressOptions } from "@/lib/queries/user";
import { captureException } from "@/lib/report";

type Props = {
  communityId: string;
};

export const CommunityLeaveButton: React.FC<Props> = ({ communityId }) => {
  const { getToken, userId, isSignedIn } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("community");

  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, address),
  );

  const { mutateAsync: leaveCommunity, isPending } = useLeaveCommunity();

  const alreadyMember = userRoles?.includes("member");

  if (!alreadyMember) return null;

  const handleLeave = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      await leaveCommunity({
        communityId,
        token,
        userAddress: address,
      });

      toast({
        title: t("leave-success"),
        description: t("leave-success-desc"),
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !==
          "[unknown] user is the only administrator of this community and cannot leave it"
      ) {
        captureException(err);
      }
      toast({
        variant: "destructive",
        title:
          err instanceof Error &&
          err.message ===
            "[unknown] user is the only administrator of this community and cannot leave it"
            ? t("leave-only-admin-error")
            : t("leave-failure"),
        description: t("leave-failure-desc"),
      });
    }
  };

  return (
    <div className="mt-4">
      <Button
        onClick={handleLeave}
        disabled={!isSignedIn || isPending}
        variant="outline"
        className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17] w-full"
      >
        {isPending ? t("leaving-state") : t("leave-community-button")}
      </Button>
    </div>
  );
};
