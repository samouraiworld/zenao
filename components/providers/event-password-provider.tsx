"use client";

import { createContext, useContext } from "react";

const defaultValue = {
  password: "",
};

const EventPasswordContext = createContext<{ password: string }>(defaultValue);

export const useEventPassword = () => useContext(EventPasswordContext);

export function EventPasswordProvider({
  password,
  children,
}: {
  password: string;
  children: React.ReactNode;
}) {
  return (
    <EventPasswordContext.Provider value={{ password }}>
      {children}
    </EventPasswordContext.Provider>
  );
}
