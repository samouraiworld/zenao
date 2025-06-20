"use client";

import { GithubIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import Text from "../texts/text";
import { Button } from "../shadcn/button";

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
        <Button
          variant="link"
          className="p-0 h-fit"
          onClick={() => {
            const eventId =
              Sentry.lastEventId() ||
              // Fallback in case Sentry didn't capture an error before the user clicked the button
              Sentry.captureException(new Error("Custom Error Report"));

            Sentry.showReportDialog({
              eventId: eventId,
            });
          }}
        >
          <Text
            size="sm"
            variant="secondary"
            className="underline underline-offset-1"
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
