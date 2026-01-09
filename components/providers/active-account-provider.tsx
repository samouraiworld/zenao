"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { z } from "zod";

const activeAccountSchema = z.object({
  type: z.enum(["personal", "team"]),
  id: z.string(),
  displayName: z.string(),
  avatarUri: z.string().optional(),
});

type ActiveAccount = z.infer<typeof activeAccountSchema>;

type ActiveAccountContextProps = {
  activeAccount: ActiveAccount | null;
  switchAccount: (account: ActiveAccount) => void;
  isTeamContext: boolean;
};

const STORAGE_KEY = "zenao-active-account";

function parseStoredAccount(stored: string): ActiveAccount | null {
  try {
    const parsed: unknown = JSON.parse(stored); // eslint-disable-line no-restricted-syntax
    const result = activeAccountSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const account = parseStoredAccount(stored);
      if (account) {
        setActiveAccount(account);
      } else {
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
