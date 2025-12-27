import React from "react";
import { SignedOutDialog } from "../dialogs/signed-out-dialog";
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
        className="h-full w-full mb-10 sm:mb-0 standalone:mb-24"
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
      {isSignedOutModal && <SignedOutDialog />}
    </div>
  );
};

export const ScreenContainerCentered: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
}) => {
  return (
    <div className="flex grow flex-col items-center justify-center">
      <main className="flex flex-col w-full justify-center items-center mb-10 sm:mb-0 standalone:mb-24">
        <div className="w-full mt-8 mx-5">{children}</div>
      </main>
      {isSignedOutModal && <SignedOutDialog />}
    </div>
  );
};
