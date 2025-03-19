import { FacebookIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SmallText } from "@/components/texts/SmallText";

export const Footer = () => {
  const t = useTranslations("navigation");
  return (
    <footer className="flex flex-col gap-3 p-4 border-t">
      <div className="flex w-full justify-between sm:items-center items-start">
        <div className="flex gap-3 sm:gap-4 sm:items-center items-start">
          <Link href="/">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={24}
              height={24}
              priority
            />
          </Link>
          <div className="flex flex-row gap-2 sm:gap-3">
            <SmallText
              variant="secondary"
              className="underline underline-offset-1"
            >
              {t("footer.terms")}
            </SmallText>
            <SmallText
              variant="secondary"
              className="underline underline-offset-1"
            >
              {t("footer.privacy")}
            </SmallText>
            <SmallText
              variant="secondary"
              className="underline underline-offset-1"
            >
              {t("footer.security")}
            </SmallText>
          </div>
        </div>
        <div className="flex flex-row gap-3 sm:gap-3">
          <TwitterIcon className="h-5 w-5 text-secondary-color" />
          <FacebookIcon className="h-5 w-5 text-secondary-color" />
          <LinkedinIcon className="h-5 w-5 text-secondary-color" />
        </div>
      </div>
    </footer>
  );
};
