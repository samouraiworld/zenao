"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { userTeamsOptions } from "@/lib/queries/team";

type UserInfo = {
  displayName: string;
  avatarUri?: string;
};

export function useAccountSwitcher(userId: string, user: UserInfo) {
  const { getToken } = useAuth();
  const { activeAccount, switchAccount } = useActiveAccount();
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  const { data: teams = [] } = useQuery(userTeamsOptions(getToken, userId));
  const isPersonalActive = !activeAccount || activeAccount.type === "personal";

  const handleSwitchToPersonal = () => {
    switchAccount({
      type: "personal",
      id: userId,
      displayName: user.displayName,
      avatarUri: user.avatarUri,
    });
  };

  const handleSwitchToTeam = (team: {
    teamId: string;
    displayName: string;
    avatarUri: string;
  }) => {
    switchAccount({
      type: "team",
      id: team.teamId,
      displayName: team.displayName,
      avatarUri: team.avatarUri,
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
