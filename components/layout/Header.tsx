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

export const Header: React.FC = () => {
  const t = useTranslations("header");

  return (
    <div className="flex justify-center sm:p-2">
      {/* Desktop */}
      <Card className="max-sm:hidden flex flex-row items-center p-2 gap-1 sm:gap-2 rounded-xl">
        <Link href="/" className="flex flex-row gap-2">
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={26}
            height={26}
            priority
            className="overflow-auto"
          />
          <Text className="font-extrabold">{t("zenao")}</Text>
        </Link>

        <div className="flex flex-row gap-3 mr-3">
          <SmallText variant="secondary">{t("discover")}</SmallText>
          <SmallText variant="secondary">{t("calendar")}</SmallText>
          <SmallText variant="secondary">{t("pricing")}</SmallText>
          <SmallText variant="secondary">{t("blog")}</SmallText>
          <Link href="/manifesto">
            <SmallText variant="secondary">{t("manifesto")}</SmallText>
          </Link>
        </div>
        <Auth />
        <ToggleThemeButton />
      </Card>

      {/* Mobile */}
      <div className="sm:hidden flex flex-row justify-between w-full p-3 px-4 py-3 bg-secondary/80 backdrop-blur-sm">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={26}
            height={26}
            priority
          />
        </Link>
        <div className="flex gap-2">
          <Auth />
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
      </div>
    </div>
  );
};

function Auth() {
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
          fallback={
            <Image
              src="/pfp-fallback.png"
              alt="User"
              width={28}
              height={28}
              className="rounded-full"
              priority
            />
          }
        />
      </SignedIn>
    </>
  );
}
