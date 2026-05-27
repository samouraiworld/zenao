"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { userTeamsOptions } from "@/lib/queries/team";

const RESTRICTED_DASHBOARD_PATTERNS = [
  /^\/dashboard\/event\/[^/]+/,
  /^\/dashboard\/community\/[^/]+/,
];

function isRestrictedPage(pathname: string): boolean {
  return RESTRICTED_DASHBOARD_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );
}

export function useAccountSwitcher(userId: string) {
  const { getToken } = useAuth();
  const { activeAccount, switchAccount } = useActiveAccount();
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const { data: teams = [], isFetched } = useQuery(
    userTeamsOptions(getToken, userId),
  );
  const isPersonalActive = !activeAccount || activeAccount.type === "personal";

  useEffect(() => {
    if (!userId) return;

    if (!activeAccount) {
      switchAccount({ type: "personal", id: userId });
      return;
    }

    if (!isFetched || activeAccount.type !== "team") return;

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
    if (isRestrictedPage(pathname)) {
      router.push("/dashboard");
    }
  };

  const handleSwitchToTeam = (teamId: string) => {
    switchAccount({
      type: "team",
      id: teamId,
    });
    if (isRestrictedPage(pathname)) {
      router.push("/dashboard");
    }
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
