import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";
import { Card } from "@/components/cards/Card";
import { SmallText } from "@/components/texts/SmallText";

export default function Manifesto() {
  const t = useTranslations("manifesto");

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col justify-center lg:flex-row">
        <div className="w-full flex justify-center my-10 lg:my-0 lg:w-1/3 lg:self-center lg:justify-evenly">
          <div />
          <div />
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={200}
            height={200}
          />
        </div>
        <div className="w-full lg:w-1/3">
          <Card>
            <div className="flex flex-col gap-3">
              <div className="flex flex-row gap-2">
                <FileText className="text-secondary-color" width={15} />
                <Text variant="secondary" className="font-light">
                  {t("title")}
                </Text>
              </div>

              <Text>
                <span className="font-semibold">ZENAO</span>
                <span className="mx-[6px]">{t("means")}</span>
                <span className="text-secondary-color font-light italic">
                  Zen Autonomous Organizations
                </span>
              </Text>
              <SmallText>{t("p1")}</SmallText>
              <SmallText>{t("p2")}</SmallText>
              <SmallText>{t("p3")}</SmallText>
              <SmallText>{t("p4")}</SmallText>
              <SmallText>{t("p5")}</SmallText>
              <div>
                <SmallText>
                  <span>{t("p6")}</span>
                  <a href="https://samourai.world" className="mx-[6px]">
                    <span className="text-blue-600">Samourai.world</span>
                  </a>
                  <span>{t("p6-end")}</span>
                </SmallText>
                <SmallText variant="secondary">{t("p6-ref")}</SmallText>
              </div>
              <div>
                <SmallText>{t("p7")}</SmallText>
                <a href="https://zenao.io">
                  <SmallText className="text-orange-600">zenao.io</SmallText>
                </a>
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:w-1/3" />
      </div>
    </ScreenContainerCentered>
  );
}
