"use client";

import * as Sentry from "@sentry/nextjs";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { Badge } from "@/components/shadcn/badge";

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
      <div className="flex flex-row items-center gap-3">
        <Text size="sm" variant="secondary">
          {t("footer.tagline")}
        </Text>
        <Badge variant="secondary" className="rounded">
          <Text size="sm" variant="secondary">
            version 0.7 beta
          </Text>
        </Badge>
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
