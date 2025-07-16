import React from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import Image from "next/image";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";

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
            fetchPriority="high"
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
              <Text size="sm">{t("p1")}</Text>
              <Text size="sm">{t("p2")}</Text>
              <Text size="sm">{t("p3")}</Text>
              <Text size="sm">{t("p4")}</Text>
              <Text size="sm">{t("p5")}</Text>
              <div>
                <Text size="sm">
                  <span>{t("p6")}</span>
                  <a href="https://samourai.world" className="mx-[6px]">
                    <span className="text-blue-600">Samourai.world</span>
                  </a>
                  <span>{t("p6-end")}</span>
                </Text>
                <Text size="sm" variant="secondary">
                  {t("p6-ref")}
                </Text>
              </div>
              <div>
                <Text size="sm">{t("p7")}</Text>
                <a href="https://zenao.io">
                  <Text size="sm" className="text-orange-600">
                    zenao.io
                  </Text>
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
