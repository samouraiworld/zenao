"use client";

import React from "react";
import { ImageLoaderProps } from "next/image";
import { SignedOutModal } from "../modals/SignedOutModal";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackgroundImage } from "./background-image";
import { web2URL } from "@/lib/uris";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
  background?: ImageLoaderProps;
}

const defaultBackground: ImageLoaderProps = {
  src: web2URL(
    "ipfs://bafkreiefzfl43okbnnjwbazkntunp6plgpwnxj7rbqbcukpcnwtstuq4bu",
  ),
  width: 10,
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
  background = defaultBackground,
}) => {
  return (
    <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
      {background && <BackgroundImage {...background} />}
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
  background = defaultBackground,
}) => {
  return (
    <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
      {background && <BackgroundImage {...background} />}
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
