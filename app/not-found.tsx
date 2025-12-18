"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";

export default function NotFound() {
  const t = useTranslations("not-found");

  return (
    <ScreenContainerCentered>
      <div className="mx-auto max-w-md flex flex-col">
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
      </div>
    </ScreenContainerCentered>
  );
}
