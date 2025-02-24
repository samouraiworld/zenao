import React from "react";
import { ImageLoaderProps } from "next/image";
import { SignedOutModal } from "../modals/SignedOutModal";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { web3ImgLoader } from "@/lib/web3-img-loader";

interface ScreenContainerProps {
  children: React.ReactNode;
  isSignedOutModal?: boolean;
  background?: ImageLoaderProps;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  isSignedOutModal,
  background,
}) => {
  let backgroundContent = null;
  if (background) {
    const url = web3ImgLoader(background);
    const style = {
      backgroundImage: `url(${url})`,
      filter: `blur(8rem)`,
      backgroundSize: "100% 100%",
      position: `absolute`,
      width: "100%",
      height: "100%",
      transition: "background-image 2s",
      zIndex: -1,
    } as const;
    backgroundContent = (
      <div style={style} className="opacity-25 sm:opacity-15"></div>
    );
  }

  return (
    <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
      {backgroundContent}
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
