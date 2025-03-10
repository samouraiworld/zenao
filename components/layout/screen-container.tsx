"use client";

import Image, { ImageLoaderProps } from "next/image";
import { ReactNode } from "react";
import { SignedOutModal } from "../modals/signed-out-modal";
import { web3ImgLoader } from "@/lib/web3-img-loader";

function BackgroundImage(props: ImageLoaderProps) {
  return (
    <Image
      alt="Background"
      src={props.src}
      width={props.width}
      height={props.width}
      priority
      loader={web3ImgLoader}
      className={`absolute pointer-events-none w-full h-full blur-[8rem] opacity-25 sm:opacity-15`}
    />
  );
}

interface ScreenContainerProps {
  children: ReactNode;
  isSignedOutModal?: boolean;
  background?: ImageLoaderProps;
}

export function ScreenContainer({
  children,
  isSignedOutModal,
  background,
}: ScreenContainerProps) {
  return (
    <div className="flex flex-col flex-1 items-center">
      {background && <BackgroundImage {...background} />}
      <main className="h-full w-full max-w-[960px] mb-10 sm:mb-0">
        <div className="mt-8 mx-5">{children}</div>
      </main>
      {isSignedOutModal && <SignedOutModal />}
    </div>
  );
}

export function ScreenContainerCentered({
  children,
  isSignedOutModal,
}: ScreenContainerProps) {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <main className="flex flex-col w-full justify-center items-center mb-10 sm:mb-0">
        <div className="mt-8 mx-5">{children}</div>
      </main>
      {isSignedOutModal && <SignedOutModal />}
    </div>
  );
}
