"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ButtonWithChildren } from "../buttons/ButtonWithChildren";
import Text from "../texts/text";
import { LazyInstallButton } from "../buttons/pwa-install-button";

export function HomeCTA() {
  const t = useTranslations("home");
  return (
    <div className="flex flex-col gap-2 items-center">
      <Link href="/create">
        <ButtonWithChildren className="w-full flex rounded-3xl py-5">
          <Text variant="invert" className="text-sm">
            {t("button")}
          </Text>
        </ButtonWithChildren>
      </Link>

      <LazyInstallButton />
    </div>
  );
}
