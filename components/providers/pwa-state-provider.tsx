"use client";

import { createContext, useContext, useState } from "react";

type PwaStateProviderContextProps = {
  displayBottomBar: boolean;
  onDisplayBottomBarChange: (display: boolean) => void;
};

const defaultValue: PwaStateProviderContextProps = {
  displayBottomBar: true,
  onDisplayBottomBarChange: () => {},
};

const PwaStateContext =
  createContext<PwaStateProviderContextProps>(defaultValue);

export const usePwaContext = () => useContext(PwaStateContext);

function PwaStateProvider({ children }: { children: React.ReactNode }) {
  const [displayBottomBar, setDisplayBottomBar] = useState<boolean>(true);

  const onDisplayBottomBarChange = (display: boolean) => {
    setDisplayBottomBar(display);
  };

  return (
    <PwaStateContext.Provider
      value={{
        displayBottomBar,
        onDisplayBottomBarChange,
      }}
    >
      {children}
    </PwaStateContext.Provider>
  );
}

export default PwaStateProvider;
