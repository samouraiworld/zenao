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
  const teamId = activeAccount?.type === "team" ? activeAccount?.id : undefined;

  // Current active account info
  const { data: accountInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId, teamId),
  );
  console.log("Account info:", accountInfo);

  if (!accountInfo) {
    return null;
  }

  const result = planSchema.safeParse(accountInfo.actorPlan || "free");
  const plan = result.success ? result.data : "free";

  // actingAs is the current account id
  // userId === userId if personal
  return {
    type: activeAccount?.type === "team" ? "team" : "personal",
    userId: accountInfo.userId,
    actingAs: accountInfo.actorId,
    plan: plan,
  };
}
