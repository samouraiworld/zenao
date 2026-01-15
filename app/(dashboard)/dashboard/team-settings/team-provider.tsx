"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserTeam } from "@/app/gen/zenao/v1/zenao_pb";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { userTeamsOptions } from "@/lib/queries/team";
import { userInfoOptions } from "@/lib/queries/user";

// TODO create SafeUserTeam type in types/schemas.ts
const TeamContext = createContext<UserTeam>({} as never);

interface TeamContextProviderProps {
  children: React.ReactNode;
}

export function useTeamContext() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamContextProvider");
  }
  return context;
}

export function TeamProvider({ children }: TeamContextProviderProps) {
  const router = useRouter();
  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );
  const userId = userInfo?.userId;

  const { activeAccount } = useActiveAccount();
  const { data: teams = [] } = useSuspenseQuery(
    userTeamsOptions(getToken, userId),
  );

  useEffect(() => {
    if (!activeAccount) return;
    if (activeAccount.type !== "team") {
      router.replace("/dashboard");
    }
    const teamExists = teams.some((t) => t.teamId === activeAccount.id);
    if (!teamExists) {
      router.replace("/dashboard");
    }
  }, [router, activeAccount, teams]);

  const activeTeam = useMemo(() => {
    if (activeAccount?.type !== "team") return null;
    return teams.find((t) => t.teamId === activeAccount.id) || null;
  }, [activeAccount, teams]);

  if (!activeTeam) {
    return null;
  }

  return (
    <TeamContext.Provider value={activeTeam}>{children}</TeamContext.Provider>
  );
}
