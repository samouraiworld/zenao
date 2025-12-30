"use client";

import { createContext, useContext } from "react";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { EventUserRole } from "@/lib/queries/event-users";

/// Provides information about the event & the user roles in the dashboard context

type DashboardEventContextProps = {
  eventId: string;
  eventInfo: EventInfo;
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
  eventInfo: EventInfo;
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
