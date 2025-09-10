"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "../shadcn/button";
import { useLeaveCommunity } from "@/lib/mutations/community-leave";
import { communityUserRoles } from "@/lib/queries/community";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { userAddressOptions } from "@/lib/queries/user";

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
      captureException(err);
      toast({
        variant: "destructive",
        title: t("leave-failure"),
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
        className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17]"
      >
        {isPending ? t("leaving-state") : t("leave-community-button")}
      </Button>
    </div>
  );
};
