"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";

export default function NotFound() {
  const t = useTranslations("not-found");

  return (
    <ScreenContainerCentered>
      <Heading level={1} size="4xl" className="text-center">
        404
      </Heading>
      <Text className="text-center">{t("label")}</Text>
      <br />
      <Link href="/">
        <ButtonWithChildren>
          <Text variant="invert" size="sm">
            {t("button")}
          </Text>
        </ButtonWithChildren>
      </Link>
    </ScreenContainerCentered>
  );
}
