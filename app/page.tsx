"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { ExtraLargeText } from "@/components/texts/extra-large-text";
import { SmallText } from "@/components/texts/small-text";
import { ButtonWithChildren } from "@/components/buttons/button-with-children";

export default function Home() {
  const t = useTranslations("home");

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col items-center">
        <Image
          src="/zenao-logo.png"
          alt="zeano logo"
          width={200}
          height={200}
          priority
          className="mb-5 mt-5"
        />
        <ExtraLargeText className="w-[200px] text-center">
          {t("main-text")}
        </ExtraLargeText>
        <SmallText className="my-10 w-[280px] text-center" variant="secondary">
          {t("secondary-text")}
        </SmallText>
        <Link href="/create">
          <ButtonWithChildren className="w-full flex rounded-3xl py-5">
            <SmallText variant="invert">{t("button")}</SmallText>
          </ButtonWithChildren>
        </Link>
      </div>
    </ScreenContainerCentered>
  );
}
