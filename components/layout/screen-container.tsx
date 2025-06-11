"use client";

import React from "react";
import { SignedOutModal } from "../modals/signed-out-modal";
import { BackgroundImage, BackgroundProps } from "./background-image";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
  background?: BackgroundProps;
  screenContainerMaxWidth?: number;
}

export const defaultScreenContainerMaxWidth = 1280;
export const screenContainerMarginHorizontal = 20;

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
  background,
  screenContainerMaxWidth = defaultScreenContainerMaxWidth,
}) => {
  return (
    <div className="flex flex-col flex-1 items-center">
      {background && <BackgroundImage {...background} />}
      <main
        className="h-full w-full mb-10 sm:mb-0"
        style={{ maxWidth: screenContainerMaxWidth }}
      >
        <div
          className="mt-8"
          style={{
            marginLeft: screenContainerMarginHorizontal,
            marginRight: screenContainerMarginHorizontal,
          }}
        >
          {children}
        </div>
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
