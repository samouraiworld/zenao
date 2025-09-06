"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "../shadcn/button";
import { useJoinCommunity } from "@/lib/mutations/community-join";
import { communityUserRoles } from "@/lib/queries/community";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { userAddressOptions } from "@/lib/queries/user";

type Props = {
  communityId: string;
};

export const CommunityJoinButton: React.FC<Props> = ({ communityId }) => {
  const { getToken, userId, isSignedIn } = useAuth();
  const { toast } = useToast();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, address),
  );

  const {
    mutateAsync: joinCommunity,
    isPending,
    isSuccess,
    isError,
  } = useJoinCommunity();

  const alreadyMember = userRoles?.includes("member");

  const handleJoin = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      await joinCommunity({
        communityId,
        token,
        userAddress: address,
      });

      toast({
        title: "Successfully joined the community!",
      });
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: "Failed to join the community",
        description: "Please try again later.",
      });
    }
  };
  const t = useTranslations("community");

  if (alreadyMember) return null;

  return (
    <div className="mt-4">
      <Button
        onClick={handleJoin}
        disabled={!isSignedIn || isPending}
        variant="outline"
        className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17]"
      >
        {!isSignedIn
          ? t("sign-in-to-join-button")
          : isPending
            ? t("joining-state")
            : t("join-community-button")}
      </Button>
    </div>
  );
};
