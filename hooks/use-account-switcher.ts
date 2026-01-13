"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { userTeamsOptions } from "@/lib/queries/team";

export function useAccountSwitcher(userId: string) {
  const { getToken } = useAuth();
  const { activeAccount, switchAccount } = useActiveAccount();
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  const { data: teams = [], isFetched } = useQuery(
    userTeamsOptions(getToken, userId),
  );
  const isPersonalActive = !activeAccount || activeAccount.type === "personal";

  useEffect(() => {
    if (!isFetched || activeAccount?.type !== "team") return;
    const teamExists = teams.some((t) => t.teamId === activeAccount.id);
    if (!teamExists) {
      switchAccount({ type: "personal", id: userId });
    }
  }, [isFetched, teams, activeAccount, userId, switchAccount]);

  const handleSwitchToPersonal = () => {
    switchAccount({
      type: "personal",
      id: userId,
    });
  };

  const handleSwitchToTeam = (teamId: string) => {
    switchAccount({
      type: "team",
      id: teamId,
    });
  };

  return {
    teams,
    activeAccount,
    isPersonalActive,
    isCreateTeamOpen,
    setIsCreateTeamOpen,
    handleSwitchToPersonal,
    handleSwitchToTeam,
  };
}
