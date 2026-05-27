"use client";

import { createContext, useContext } from "react";
import { CommunityUserRole, SafeCommunityInfo } from "@/types/schemas";

interface DashboardCommunityContextProps {
  communityId: string;
  communityInfo: SafeCommunityInfo;
  roles: CommunityUserRole[];
}

const DashboardCommunityContext = createContext<DashboardCommunityContextProps>(
  {} as never,
);

interface DashboardCommunityContextProviderProps {
  communityData: SafeCommunityInfo;
  roles: CommunityUserRole[];
  children: React.ReactNode;
}

export default function DashboardCommunityContextProvider({
  communityData,
  roles,
  children,
}: DashboardCommunityContextProviderProps) {
  return (
    <DashboardCommunityContext.Provider
      value={{
        communityId: communityData.id,
        communityInfo: communityData,
        roles,
      }}
    >
      {children}
    </DashboardCommunityContext.Provider>
  );
}

export function useDashboardCommunityContext() {
  const context = useContext(DashboardCommunityContext);

  if (!context) {
    throw new Error(
      "useDashboardCommunityContext must be used within a DashboardCommunityContextProvider",
    );
  }
  return context;
}
