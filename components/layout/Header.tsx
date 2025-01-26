import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlignJustify as AlignJustifyIcon } from "lucide-react";
import { PopoverContent } from "@radix-ui/react-popover";
import { Button } from "../shadcn/button";
import { Popover, PopoverTrigger } from "../shadcn/popover";
import { Card } from "../cards/Card";
import { SmallText } from "../texts/SmallText";
import { Text } from "../texts/DefaultText";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

export const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const t = useTranslations("header");

  return (
    <div className="flex justify-center sm:p-2">
      {!isMobile ? (
        <Card className="flex flex-row items-center p-2 gap-1 sm:gap-2 rounded-xl">
          <Link href="/" className="flex flex-row gap-2">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={26}
              height={26}
              priority
              className="sm:overflow-auto"
            />
            <Text className="font-extrabold">{t("zenao")}</Text>
          </Link>

          <div className="flex flex-row gap-3 sm:gap-5 mr-3 sm:mx-4">
            <SmallText variant="secondary">{t("discover")}</SmallText>
            <SmallText variant="secondary">{t("calendar")}</SmallText>
            <SmallText variant="secondary">{t("pricing")}</SmallText>
            <SmallText variant="secondary">{t("blog")}</SmallText>
            <Link href="/manifesto">
              <SmallText variant="secondary">{t("manifesto")}</SmallText>
            </Link>
          </div>
          <SignedOut>
            <SignInButton>
              <Button variant="outline">
                <SmallText>{t("sign-in")}</SmallText>
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <ToggleThemeButton />
        </Card>
      ) : (
        <Card className="flex flex-row justify-between w-full p-3">
          <Link href="/">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={26}
              height={26}
              priority
              className="sm:overflow-auto"
            />
          </Link>
          <div className="flex gap-2">
            <SignedOut>
              <SignInButton>
                <Button variant="outline">
                  <SmallText>{t("sign-in")}</SmallText>
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <Popover>
              <PopoverTrigger>
                <AlignJustifyIcon width={26} height={26} />
              </PopoverTrigger>
              <PopoverContent className="flex gap-1 flex-col bg-secondary rounded-xl px-4 py-2">
                <SmallText>{t("discover")}</SmallText>
                <SmallText>{t("calendar")}</SmallText>
                <SmallText>{t("pricing")}</SmallText>
                <SmallText>{t("blog")}</SmallText>
                <Link href="/manifesto">
                  <SmallText variant="secondary">{t("manifesto")}</SmallText>
                </Link>
              </PopoverContent>
            </Popover>
          </div>
        </Card>
      )}
    </div>
  );
};
