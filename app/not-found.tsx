"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { Text } from "@/components/texts/default-text";
import { SmallText } from "@/components/texts/small-text";
import { ButtonWithChildren } from "@/components/buttons/button-with-children";
import { LargeText } from "@/components/texts/large-text";

export default function NotFound() {
  const t = useTranslations("not-found");

  return (
    <ScreenContainerCentered>
      <LargeText className="text-center text-4xl">404</LargeText>
      <Text className="text-center">{t("label")}</Text>
      <br />
      <Link href="/">
        <ButtonWithChildren>
          <SmallText variant="invert">{t("button")}</SmallText>
        </ButtonWithChildren>
      </Link>
    </ScreenContainerCentered>
  );
}
