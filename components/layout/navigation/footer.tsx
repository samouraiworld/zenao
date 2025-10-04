"use client";

import * as Sentry from "@sentry/nextjs";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";

export const Footer = () => {
  const t = useTranslations("navigation");

  const [feedback, setFeedback] =
    useState<ReturnType<typeof Sentry.getFeedback>>(undefined);

  // Read `getFeedback` on the client only, to avoid hydration errors during server rendering
  useEffect(() => {
    setFeedback(Sentry.getFeedback());
  }, []);

  return (
    <footer className="standalone:hidden flex flex-row justify-between items-end p-4">
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
        {!!feedback && (
          <Button
            variant="link"
            className="p-0 h-fit"
            onClick={async () => {
              const form = await feedback.createForm();
              form.appendToDom();
              form.open();
            }}
          >
            <Text
              size="sm"
              variant="secondary"
              className="underline underline-offset-1"
              id="report-btn"
            >
              {t("footer.report-bug")}
            </Text>
          </Button>
        )}
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
