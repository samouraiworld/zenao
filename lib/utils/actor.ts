import { auth } from "@clerk/nextjs/server";
import { getQueryClient } from "../get-query-client";
import { getActiveAccountServer } from "../active-account/server";
import { userInfoOptions } from "../queries/user";
import { planSchema, PlanType } from "@/types/schemas";

export interface GetActorResponse {
  type: "personal" | "team";
  userId: string;
  actingAs: string;
  plan: PlanType; // Actor's plan
}

export default async function getActor(): Promise<GetActorResponse | null> {
  const queryClient = getQueryClient();
  const { getToken, userId: authId } = await auth();
  const token = await getToken();

  const activeAccount = await getActiveAccountServer();
  const teamId = activeAccount?.type === "team" ? activeAccount?.id : undefined;

  // Current active account info
  const accountInfo = await queryClient.fetchQuery(
    userInfoOptions(getToken, authId, teamId),
  );

  if (!token || !accountInfo) {
    return null;
  }

  const plan = await planSchema.parseAsync(accountInfo.actorPlan || "free");

  return {
    userId: accountInfo.userId,
    actingAs: accountInfo.actorId,
    type: activeAccount?.type === "team" ? "team" : "personal",
    plan,
  };
}
