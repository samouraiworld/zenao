"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { userInfoOptions } from "@/lib/queries/user";
import { planSchema } from "@/types/schemas";
import { GetActorResponse } from "@/lib/utils/actor";

export default function useActor(): GetActorResponse | null {
  const { getToken, userId: authId } = useAuth();

  const { activeAccount } = useActiveAccount();
  console.log("Active Account in useActor:", activeAccount);
  const teamId = activeAccount?.type === "team" ? activeAccount?.id : undefined;

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );
  // Current active account info
  const { data: accountInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId, teamId),
  );

  if (!userInfo || !accountInfo) {
    return null;
  }

  const result = planSchema.safeParse(accountInfo.plan || "free");
  const plan = result.success ? result.data : "free";

  return {
    type: activeAccount?.type === "team" ? "team" : "personal",
    userId: userInfo.userId,
    actingAs: accountInfo.userId,
    plan: plan,
  };
}
