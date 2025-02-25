"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { SmallText } from "../texts/SmallText";
import { Button } from "../shadcn/button";

export function Auth() {
  return <AuthInternal />;
}

function AuthInternal() {
  const t = useTranslations("header");
  return (
    <>
      <SignedOut>
        <SignInButton>
          <Button variant="outline">
            <SmallText>{t("sign-in")}</SmallText>
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          // we need this fallback otherwise the profile button flickers while mounting
          fallback={<PfPFallback />}
        />
      </SignedIn>
    </>
  );
}

function PfPFallback() {
  return (
    <Image
      src="/pfp-fallback.png"
      alt="User"
      width={28}
      height={28}
      className="rounded-full"
      priority
    />
  );
}
