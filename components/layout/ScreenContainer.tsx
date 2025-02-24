import React from "react";
import { SignedOutModal } from "../modals/SignedOutModal";
import { Header } from "./Header";
import { Footer } from "./Footer";
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
        backgroundImage: `url(${web2URL(backgroundSource)})`,
        filter: `blur(200px)`,
        backgroundSize: "100% auto",
        position: `absolute`,
        width: "100%",
        height: "100%",
        opacity: 0.15,
        transition: "background-image 2s",
        zIndex: -1,
      }
    : {};

  return (
    <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
      {!!backgroundSource && <div style={backgroundStyle}></div>}
      <Header />
      <div className="flex flex-col flex-1 items-center">
        <main className="h-full w-full max-w-[960px] mb-10 sm:mb-0">
          <div className="mt-8 mx-5">{children}</div>
        </main>
      </div>
      {isSignedOutModal && <SignedOutModal />}
      <Footer />
    </div>
  );
};

export const ScreenContainerCentered: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
}) => {
  return (
    <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
      <Header />
      <div className="h-screen flex flex-col items-center justify-center">
        <main className="flex flex-col w-full justify-center items-center mb-10 sm:mb-0">
          <div className="mt-8 mx-5">{children}</div>
        </main>
      </div>
      {isSignedOutModal && <SignedOutModal />}
      <Footer />
    </div>
  );
};
