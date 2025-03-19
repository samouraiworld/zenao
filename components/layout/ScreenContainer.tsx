"use client";

import React from "react";
import { SignedOutModal } from "../modals/SignedOutModal";
import { BackgroundImage, BackgroundProps } from "./background-image";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
  background?: BackgroundProps;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
  background,
}) => {
  return (
    <div className="flex flex-col flex-1 items-center">
      {background && <BackgroundImage {...background} />}
      <main className="h-full w-full max-w-[960px] mb-10 sm:mb-0">
        <div className="mt-8 mx-5">{children}</div>
      </main>
      {isSignedOutModal && <SignedOutModal />}
    </div>
  );
};

export const ScreenContainerCentered: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
}) => {
  return (
    <div className="flex grow flex-col items-center justify-center">
      <main className="flex flex-col w-full justify-center items-center mb-10 sm:mb-0">
        <div className="mt-8 mx-5">{children}</div>
      </main>
      {isSignedOutModal && <SignedOutModal />}
    </div>
  );
};
