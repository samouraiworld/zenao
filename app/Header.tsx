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

const HeaderLinks: React.FC = () => {
  const t = useTranslations("header");

  return (
    <>
      <Link href="/discover">
        <SmallText variant="secondary">{t("discover")}</SmallText>
      </Link>
      <Link href="/created">
        <SmallText variant="secondary">Your events</SmallText>
      </Link>
      <Link href="/tickets">
        <SmallText variant="secondary">Your tickets</SmallText>
      </Link>
      <SmallText variant="secondary">{t("features")}</SmallText>
      <Link href="/manifesto">
        <SmallText variant="secondary">{t("manifesto")}</SmallText>
      </Link>
    </>
  );
};

export const Header: React.FC = () => {
  const t = useTranslations("header");

  return (
    <div className="flex justify-center sm:p-2">
      {/* Desktop */}
      <Card className="max-sm:hidden flex flex-row items-center px-3 py-2 gap-7 rounded-xl">
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
          <HeaderLinks />
        </div>
        <div className="flex flex-row gap-2 items-center justify-center">
          <Auth />
          <ToggleThemeButton />
        </div>
      </Card>

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
        <div className="flex flex-row gap-2">
          <Auth />
          <Popover>
            <PopoverTrigger>
              <AlignJustifyIcon width={26} height={26} />
            </PopoverTrigger>
            <PopoverContent className="flex gap-1 flex-col bg-secondary rounded-xl px-4 py-2">
              <HeaderLinks />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

async function Auth() {
  const queryClient = getQueryClient();
  const { getToken } = await auth();
  const authToken = await getToken();
  const t = await getTranslations("header");
  const user = await queryClient.fetchQuery(userOptions(authToken));

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
        {user && (
          <Link href="/settings">
            <Avatar className="h-8 w-8 self-center">
              <AvatarImage src={user.avatarUri} alt="avatar-uri" />
              <AvatarFallback>avatar</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </SignedIn>
    </>
  );
}
