"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";
import { Card } from "@/components/cards/Card";
import { SmallText } from "@/components/texts/SmallText";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";

export default function Error({
  error,
  reset: reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <ScreenContainerCentered>
      <Text className="text-center">{t("label")}</Text>
      <br />
      <Card>
        <code className="text-sm">{error.digest}</code>
      </Card>
      <br />
      <ButtonWithChildren onClick={() => reset()}>
        <SmallText variant="invert">{t("retry-button")}</SmallText>
      </ButtonWithChildren>
    </ScreenContainerCentered>
  );
}
