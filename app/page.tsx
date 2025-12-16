import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { LazyInstallButton } from "@/components/widgets/buttons/pwa-install-button";
import { Card } from "@/components/widgets/cards/card";
import { BaseLogo } from "@/components/widgets/icons";

export default function Home() {
  const t = useTranslations("home");

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col items-center">
        <Card className="mx-4 max-w-[580px] flex flex-wrap items-center mb-8">
          <Text variant="secondary" className="pr-1.5">
            {t("base-news")}
          </Text>
          <BaseLogo className="h-3 dark:fill-secondary-color" />
        </Card>
        <Image
          src="/zenao-logo.png"
          alt="zeano logo"
          width={200}
          height={200}
          priority
          fetchPriority="high"
          className="mb-5 mt-5"
        />
        <Heading level={1} size="4xl" className="max-w-[560px] text-center">
          {t("main-text")}
        </Heading>
        <Text
          size="sm"
          className="my-10 w-[280px] text-center"
          variant="secondary"
        >
          {t("secondary-text")}
        </Text>

        <div className="flex flex-col gap-2 items-center">
          <Link href="/event/create">
            <ButtonWithChildren className="w-full flex rounded-3xl py-5">
              <Text variant="invert" className="text-sm">
                {t("button")}
              </Text>
            </ButtonWithChildren>
          </Link>

          {/* we need this div because the button is causing a layout shift otherwise */}
          <div className="h-[2.25rem]">
            <LazyInstallButton />
          </div>
        </div>
      </div>
    </ScreenContainerCentered>
  );
}
