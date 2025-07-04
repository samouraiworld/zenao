import { useTranslations } from "next-intl";
import Image from "next/image";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { HomeCTA } from "@/components/widgets/home-cta";

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
          fetchPriority="high"
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
        <HomeCTA />
      </div>
    </ScreenContainerCentered>
  );
}
