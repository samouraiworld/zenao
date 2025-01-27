import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { SmallText } from "@/components/texts/SmallText";

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
        <VeryLargeText className="w-[200px] text-center">
          {t("main-text")}
        </VeryLargeText>
        <SmallText className="my-10 w-[280px] text-center" variant="secondary">
          {t("secondary-text")}
        </SmallText>
        <Link href="/create">
          <Button className="w-full flex rounded-3xl py-5">
            <SmallText variant="invert">{t("button")}</SmallText>
          </Button>
        </Link>
      </div>
    </ScreenContainerCentered>
  );
}
