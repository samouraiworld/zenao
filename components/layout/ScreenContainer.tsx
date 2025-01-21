"use client";

import React from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface ScreenContainerProps {
  children: React.ReactNode;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
}) => {
  return (
    <div className="sm:h-screen flex flex-col family-name:var(--font-geist-sans)]">
      <Header />
      <div className="sm:h-screen flex flex-col items-center">{children}</div>
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
