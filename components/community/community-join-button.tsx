"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "../shadcn/button";
import { useJoinCommunity } from "@/lib/mutations/community-join";
import { communityUserRoles } from "@/lib/queries/community";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";

type Props = {
  communityId: string;
};

export const CommunityJoinButton: React.FC<Props> = ({ communityId }) => {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const address = user?.publicMetadata?.address as string | null;

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

  if (alreadyMember) return null; // TODO check why it still appears

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
      {isError && (
        <p className="text-red-500 mt-2">An error occurred. Try again.</p>
      )}
      {isSuccess && (
        <p className="text-green-500 mt-2">You&apos;ve joined the community!</p>
      )}
      {!isSignedIn
        ? t("sign-in-to-join-button")
        : isPending
          ? t("joining-state")
          : t("join-community-button")}
    </div>
  );
};
