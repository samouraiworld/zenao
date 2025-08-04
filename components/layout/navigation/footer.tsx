"use client";

import { GithubIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import Link from "next/link";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";

export const Footer = () => {
  const t = useTranslations("navigation");

  return (
    <footer className="flex flex-row justify-between items-end p-4 sm:px-12">
      <div className="flex flex-row gap-3 sm:gap-5">
        <Text
          size="sm"
          variant="secondary"
          className="underline underline-offset-1"
        >
          {t("footer.terms")}
        </Text>
        <Text
          size="sm"
          variant="secondary"
          className="underline underline-offset-1"
        >
          {t("footer.privacy")}
        </Text>
        <Text
          size="sm"
          variant="secondary"
          className="underline underline-offset-1"
        >
          {t("footer.security")}
        </Text>
        <Button variant="link" className="p-0 h-fit">
          <Text
            size="sm"
            variant="secondary"
            className="underline underline-offset-1"
            id="report-btn"
          >
            {t("footer.report-bug")}
          </Text>
        </Button>
      </div>
      <div className="flex flex-row align-center gap-3 sm:gap-5">
        <Link href="https://x.com/samouraicoop" target="_blank">
          <TwitterIcon className="text-secondary-color hover:text-primary-color h-5 w-5" />
        </Link>
        <Link href="https://github.com/samouraiworld/zenao" target="_blank">
          <GithubIcon className="text-secondary-color hover:text-primary-color h-5 w-5" />
        </Link>
      </div>
    </footer>
  );
};
