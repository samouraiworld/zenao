"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";
import { SmallText } from "@/components/texts/SmallText";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { LargeText } from "@/components/texts/LargeText";

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
