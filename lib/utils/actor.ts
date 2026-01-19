import { auth } from "@clerk/nextjs/server";
import { getQueryClient } from "../get-query-client";
import { getActiveAccountServer } from "../active-account/server";
import { userInfoOptions } from "../queries/user";
import { planSchema, PlanType } from "@/types/schemas";

export interface GetActorResponse {
  type: "personal" | "team";
  actorId: string;
  plan: PlanType;
}

export default async function getActor(): Promise<GetActorResponse | null> {
  const queryClient = getQueryClient();
  const { getToken, userId: authId } = await auth();
  const token = await getToken();

  const userInfo = await queryClient.fetchQuery(
    userInfoOptions(getToken, authId),
  );
  const activeAccount = await getActiveAccountServer();

  const teamId = activeAccount?.type === "team" ? activeAccount?.id : undefined;

  // Current active account info
  const accountInfo =
    !activeAccount || activeAccount?.type === "personal"
      ? userInfo
      : await queryClient.fetchQuery(userInfoOptions(getToken, authId, teamId));

  if (!token || !accountInfo) {
    return null;
  }

  const currentAccountId = accountInfo.userId;
  const plan = await planSchema.parseAsync(accountInfo.plan || "free");

  return {
    actorId: currentAccountId,
    type: activeAccount?.type === "team" ? "team" : "personal",
    plan,
  };
}
