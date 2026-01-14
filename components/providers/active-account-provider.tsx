"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getQueryClient } from "@/lib/get-query-client";
import {
  type ActiveAccount,
  getActiveAccountCookie,
  setActiveAccountCookie,
  clearActiveAccountCookie,
} from "@/lib/active-account/cookie";

type ActiveAccountContextProps = {
  activeAccount: ActiveAccount | null;
  switchAccount: (account: ActiveAccount) => void;
  isTeamContext: boolean;
};

const defaultValue: ActiveAccountContextProps = {
  activeAccount: null,
  switchAccount: () => {},
  isTeamContext: false,
};

const ActiveAccountContext =
  createContext<ActiveAccountContextProps>(defaultValue);

export const useActiveAccount = () => useContext(ActiveAccountContext);

function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const [activeAccount, setActiveAccount] = useState<ActiveAccount | null>(
    null,
  );

  useEffect(() => {
    const account = getActiveAccountCookie();
    if (account) {
      setActiveAccount(account);
    } else {
      clearActiveAccountCookie();
    }
  }, []);

  const switchAccount = (account: ActiveAccount) => {
    setActiveAccount(account);
    setActiveAccountCookie(account);
    getQueryClient().invalidateQueries();
  };

  return (
    <ActiveAccountContext.Provider
      value={{
        activeAccount,
        switchAccount,
        isTeamContext: activeAccount?.type === "team",
      }}
    >
      {children}
    </ActiveAccountContext.Provider>
  );
}

export default ActiveAccountProvider;
