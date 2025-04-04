import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { Web3Image } from "@/components/images/web3-image";

export default function Home() {
  const t = useTranslations("home");

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col items-center">
        <Web3Image
          src="/zenao-logo.png"
          alt="zeano logo"
          width={200}
          height={200}
          priority
          className="mb-5 mt-5"
        />
        <Heading level={1} size="4xl" className="w-[200px] text-center">
          {t("main-text")}
        </Heading>
        <Text
          size="sm"
          className="my-10 w-[280px] text-center"
          variant="secondary"
        >
          {t("secondary-text")}
        </Text>
        <Link href="/create">
          <ButtonWithChildren className="w-full flex rounded-3xl py-5">
            <Text variant="invert" className="text-sm">
              {t("button")}
            </Text>
          </ButtonWithChildren>
        </Link>
      </div>
    </ScreenContainerCentered>
  );
}
