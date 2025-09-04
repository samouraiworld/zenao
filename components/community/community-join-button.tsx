"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useJoinCommunity } from "@/lib/mutations/community-join";
import { communityUserRoles } from "@/lib/queries/community";
import { captureException } from "@/lib/report";

type Props = {
  communityId: string;
};

// JoinCommunityButton or CommunityJoinButton
export const CommunityJoinButton: React.FC<Props> = ({ communityId }) => {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const address = user?.publicMetadata?.address as string | null;

  const {
    data: roles,
    isLoading: rolesLoading,
    isError: rolesError, // TODO handle already join error message
  } = useQuery(communityUserRoles(communityId, address));

  const {
    mutateAsync: joinCommunity,
    isPending,
    isSuccess,
    isError,
  } = useJoinCommunity();

  const alreadyMember = roles?.includes("member");

  const handleJoin = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
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

  if (!isSignedIn || rolesLoading || alreadyMember) return null;

  return (
    <div className="mt-4">
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Joining..." : "Join Community"}
      </button>

      {isError && (
        <p className="text-red-500 mt-2">An error occurred. Try again.</p>
      )}

      {isSuccess && (
        <p className="text-green-500 mt-2">You’ve joined the community!</p>
      )}
    </div>
  );
};
