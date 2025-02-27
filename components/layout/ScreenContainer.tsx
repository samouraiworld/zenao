"use client";

import React from "react";
import { ImageLoaderProps } from "next/image";
import { SignedOutModal } from "../modals/SignedOutModal";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackgroundImage } from "./background-image";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
  background?: ImageLoaderProps;
}

const defaultBackground: ImageLoaderProps = {
  src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAMAAAC67D+PAAAA1VBMVEXr7PLu8Pft7vTr7fLt7/Xz8/b8fgDw9v7v8fft8vvq6fLq6/Lp6fH0n4fvQmn5mWf1t139uAD6bwATddosTNZJh8sAKcdlFr+3PrOWAIzVLIDUZ7f9v3B/muflhJPw8fjv9fnw9v/x8vbp6fT////99/f/5drZ3PD/483p5vb07vXs6vXz6/P/8/KxufLe3/G2v/G/wvD64enWyeiTt+i8vuHn2d3Lv92Hide9uNa/Z9DAms//6cNjUsLpxb/3xKH0opjxzJXdTY/PZHX+5GDyX1v7pka0v0S7AAAAJHRSTlPBzcPDrhv839nOx6Wf/Pz8/Pz8+/v7+/v7+/v4+Pf339zMsRdzt4hNAAAAcElEQVQI1xXMRQKDMAAEwA0hQCl1dyNA3Q33/z8JuM5hwLaKLK/Wisgg6twy+OOk10H4XGo1mrM9xcaS8iBMJk8BNaOTup/X4EpBzu3Id37DW6XdLLa93gUgh+V0POovTJTZ8ft/380yYxoEVaXQdgVyBAtks6JvagAAAABJRU5ErkJggg==",
  width: 10,
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
  background = defaultBackground,
}) => {
  return (
    <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
      <BackgroundImage {...background} />
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
      <BackgroundImage {...background} />
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
