"use client";

import React from "react";
import { SignedOutModal } from "../modals/SignedOutModal";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
}) => {
  return (
    <div className="sm:h-screen flex flex-col family-name:var(--font-geist-sans)]">
      <Header />
      <div className="sm:h-screen flex flex-col items-center">
        <main className="flex flex-col w-full max-w-[960px] mb-10 sm:mb-0">
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
}) => {
  return (
    <div className="sm:h-screen flex flex-col family-name:var(--font-geist-sans)]">
      <Header />
      <div className="sm:h-screen flex flex-col justify-center items-center">
        {children}
      </div>
      <Footer />
    </div>
  );
};
