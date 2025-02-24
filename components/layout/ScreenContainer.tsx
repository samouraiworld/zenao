import React from "react";
import { SignedOutModal } from "../modals/SignedOutModal";
import { web2URL } from "@/lib/uris";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
  backgroundSource?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
  backgroundSource,
}) => {
  const backgroundStyle: React.CSSProperties = backgroundSource
    ? {
        backgroundImage: `url(${web2URL(backgroundSource)}?img-width=600)`,
        filter: `blur(8rem)`,
        backgroundSize: "100% 100%",
        position: `absolute`,
        width: "100%",
        height: "100%",
        transition: "background-image 2s",
        zIndex: -1,
      }
    : {};

  return (
    <div className="flex flex-col flex-1 items-center">
      {!!backgroundSource && (
        <div style={backgroundStyle} className="opacity-25 sm:opacity-15"></div>
      )}
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
    <div className="h-screen flex flex-col items-center justify-center">
      <main className="flex flex-col w-full justify-center items-center mb-10 sm:mb-0">
        <div className="mt-8 mx-5">{children}</div>
      </main>
      {isSignedOutModal && <SignedOutModal />}
    </div>
  );
};
