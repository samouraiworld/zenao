"use client";

import { createContext, useContext } from "react";
import { EventUserRole } from "@/lib/queries/event-users";
import { SafeEventInfo } from "@/types/schemas";

/// Provides information about the event & the user roles in the dashboard context

type DashboardEventContextProps = {
  eventId: string;
  eventInfo: SafeEventInfo;
  roles: EventUserRole[];
};

const DashboardEventContext = createContext<DashboardEventContextProps>(
  {} as never,
);

export function useDashboardEventContext() {
  const context = useContext(DashboardEventContext);

  if (!context) {
    throw new Error(
      "useDashboardEventContext must be used within a DashboardEventContextProvider",
    );
  }
  return context;
}

interface DashboardEventContextProviderProps {
  eventId: string;
  eventInfo: SafeEventInfo;
  roles: EventUserRole[];
  children: React.ReactNode;
}

export default function DashboardEventContextProvider({
  eventId,
  eventInfo,
  roles,
  children,
}: DashboardEventContextProviderProps) {
  return (
    <DashboardEventContext.Provider
      value={{
        eventId,
        eventInfo,
        roles,
      }}
    >
      {children}
    </DashboardEventContext.Provider>
  );
}
