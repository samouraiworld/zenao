"use client";

import * as Sentry from "@sentry/nextjs";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import SoonOnBase from "@/components/widgets/soon-on-base";
import { Discord } from "@/components/widgets/icons";

export const Footer = () => {
  const t = useTranslations("navigation");

  const [feedback, setFeedback] =
    useState<ReturnType<typeof Sentry.getFeedback>>(undefined);

  // Read `getFeedback` on the client only, to avoid hydration errors during server rendering
  useEffect(() => {
    setFeedback(Sentry.getFeedback());
  }, []);

  return (
    <footer className="standalone:hidden flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:items-end p-4">
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="flex flex-row items-center gap-3">
          <SoonOnBase className="flex sm:hidden" />
        </div>
        <div className="flex flex-row items-center gap-3">
          <Text size="sm" variant="secondary">
            {t("footer.tagline")}
          </Text>
        </div>
      </div>
      <div className="flex flex-row align-center gap-3 sm:gap-5">
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
            <Text size="sm" variant="secondary" id="report-btn">
              {t("footer.report-bug")}
            </Text>
          </Button>
        )}
        <Link href="https://x.com/zenaoHQ" target="_blank">
          <TwitterIcon className="text-secondary-color hover:text-primary-color h-5 w-5" />
        </Link>
        <Link href="https://github.com/samouraiworld/zenao" target="_blank">
          <GithubIcon className="text-secondary-color hover:text-primary-color h-5 w-5" />
        </Link>
        <Link href="https://discord.gg/TkpJgp9zjK" target="_blank">
          <Discord className="text-secondary-color hover:text-primary-color h-5 w-5" />
        </Link>
      </div>
    </footer>
  );
};
