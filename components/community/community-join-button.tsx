"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "../shadcn/button";
import { useJoinCommunity } from "@/lib/mutations/community-join";
import { communityUserRoles } from "@/lib/queries/community";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { userInfoOptions } from "@/lib/queries/user";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

type Props = {
  communityId: string;
};

export const CommunityJoinButton: React.FC<Props> = ({ communityId }) => {
  const { getToken, userId, isSignedIn } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, userRealmId),
  );

  const { mutateAsync: joinCommunity, isPending } = useJoinCommunity();

  const alreadyMember = userRoles?.includes("member");

  const handleJoin = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      await joinCommunity({
        communityId,
        token,
        userRealmId,
      });
      trackEvent("CommunityJoined", {
        props: {
          communityId,
        },
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
    <div>
      {!isSignedIn ? (
        <SignInButton>
          <Button
            variant="outline"
            className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17] w-full"
            onClick={() => {
              trackEvent("SignInClick", {
                props: { context: "join-community" },
              });
            }}
          >
            {t("sign-in-to-join-button")}
          </Button>
        </SignInButton>
      ) : (
        <Button
          onClick={handleJoin}
          disabled={isPending}
          variant="outline"
          className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17] w-full"
        >
          {isPending ? t("joining-state") : t("join-community-button")}
        </Button>
      )}
    </div>
  );
};
