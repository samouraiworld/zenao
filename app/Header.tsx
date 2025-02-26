import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlignJustify as AlignJustifyIcon } from "lucide-react";
import { PopoverContent } from "@radix-ui/react-popover";
import { auth } from "@clerk/nextjs/server";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { Popover, PopoverTrigger } from "@/components/shadcn/popover";
import { Card } from "@/components/cards/Card";
import { SmallText } from "@/components/texts/SmallText";
import { Text } from "@/components/texts/DefaultText";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import {
  AvatarImage,
  Avatar,
  AvatarFallback,
} from "@/components/shadcn/avatar";
import { getQueryClient } from "@/lib/get-query-client";
import { Button } from "@/components/shadcn/button";
import { userOptions } from "@/lib/queries/user";
import { GnoProfile } from "@/lib/queries/profile";
import { web2URL } from "@/lib/uris";

const HeaderLinks: React.FC<{ isLogged: boolean }> = ({ isLogged }) => {
  const t = useTranslations("header");

  return (
    <>
      <Link href="/discover">
        <SmallText variant="secondary">{t("discover")}</SmallText>
      </Link>
      {isLogged && (
        <Link href="/created">
          <SmallText variant="secondary">{t("your-events")}</SmallText>
        </Link>
      )}
      {isLogged && (
        <Link href="/tickets">
          <SmallText variant="secondary">{t("your-tickets")}</SmallText>
        </Link>
      )}
      <SmallText variant="secondary">{t("features")}</SmallText>
      <Link href="/manifesto">
        <SmallText variant="secondary">{t("manifesto")}</SmallText>
      </Link>
    </>
  );
};

export async function Header() {
  const queryClient = getQueryClient();
  const { getToken } = await auth();
  const authToken = await getToken();
  const t = await getTranslations("header");
  const user = await queryClient.fetchQuery(userOptions(authToken));

  return (
    <div className="flex sm:justify-center sm:p-2 w-full">
      {/* Desktop */}
      <div className="max-sm:hidden flex flex-row w-full items-center justify-center">
        <Card className="flex flex-row items-center px-3 py-2 gap-7 rounded-xl">
          <Link href="/" className="flex flex-row gap-2 items-center">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={28}
              height={28}
              priority
            />
            <Text className="font-extrabold">{t("zenao")}</Text>
          </Link>
          <div className="flex flex-row gap-3">
            <HeaderLinks isLogged={user ? true : false} />
          </div>
          <div className="flex flex-row gap-2 items-center justify-center">
            <ToggleThemeButton />
          </div>
        </Card>
        <Auth user={user} className="flex absolute right-5" />
      </div>

      {/* Mobile */}
      <div className="sm:hidden flex flex-row justify-between w-full p-3 px-4 py-3 bg-secondary/80 backdrop-blur-sm">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={28}
            height={28}
            priority
          />
        </Link>
        <div className="flex flex-row gap-2 items-center">
          <Auth user={user} />
          <Popover>
            <PopoverTrigger>
              <AlignJustifyIcon className="h-7 w-7" />
            </PopoverTrigger>
            <PopoverContent className="flex gap-1 flex-col bg-secondary rounded-xl px-4 py-2">
              <HeaderLinks isLogged={user ? true : false} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

const Auth: React.FC<{ user: GnoProfile | null; className?: string }> = ({
  user,
  className,
}) => {
  const t = useTranslations("header");
  return (
    <div className={className}>
      <SignedOut>
        <SignInButton>
          <Button variant="outline">
            <SmallText>{t("sign-in")}</SmallText>
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        {user && (
          <Link href="/settings">
            <Avatar className="h-7 w-7 sm:h-[30px] sm:w-[30px]">
              <AvatarImage src={web2URL(user.avatarUri)} alt="avatar-uri" />
              <AvatarFallback>avatar</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </SignedIn>
    </div>
  );
};
