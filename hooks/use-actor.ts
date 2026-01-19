"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { userInfoOptions } from "@/lib/queries/user";
import { planSchema } from "@/types/schemas";

export default function useActor() {
  const { getToken, userId: authId } = useAuth();

  const { activeAccount } = useActiveAccount();
  const teamId = activeAccount?.type === "team" ? activeAccount?.id : undefined;

  // Current active account info
  const { data: accountInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId, teamId),
  );

  if (!accountInfo) {
    return null;
  }

  const result = planSchema.safeParse(accountInfo.plan || "free");
  const plan = result.success ? result.data : "free";

  return {
    type: activeAccount?.type === "team" ? "team" : "personal",
    actorId: accountInfo.userId,
    plan,
  };
}
