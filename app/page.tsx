import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { SmallText } from "@/components/texts/SmallText";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";

export default async function Home() {
  const t = await getTranslations("home");

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
        <VeryLargeText className="w-[200px] text-center">
          {t("main-text")}
        </VeryLargeText>
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
