"use client";

import { createContext, useContext, useState, useEffect } from "react";

type AccountType = "personal" | "team";

type ActiveAccount = {
  type: AccountType;
  id: string;
  displayName: string;
  avatarUri?: string;
};

type ActiveAccountContextProps = {
  activeAccount: ActiveAccount | null;
  switchAccount: (account: ActiveAccount) => void;
  isTeamContext: boolean;
};

const STORAGE_KEY = "zenao-active-account";

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
    null
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setActiveAccount(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const switchAccount = (account: ActiveAccount) => {
    setActiveAccount(account);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
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
