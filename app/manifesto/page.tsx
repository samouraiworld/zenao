"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";
import { Card } from "@/components/cards/Card";

export default function Manifesto() {
  const t = useTranslations("manifesto");

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col justify-center sm:flex-row">
        <div className="w-full flex justify-center my-10 sm:my-0 sm:w-1/3 sm:self-center sm:justify-evenly">
          <div />
          <div />
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={200}
            height={200}
          />
        </div>
        <div className="w-full sm:w-1/3">
          <Card>
            <div className="flex flex-col gap-3">
              <Text variant="secondary" className="font-light">
                {t("title")}
              </Text>
              <Text>
                <span className="font-semibold">ZENAO</span>
                <span className="mx-[6px]">{t("means")}</span>
                <span className="text-secondary-color font-light italic">
                  Zen Autonomous Organizations
                </span>
              </Text>
              <Text>{t("p1")}</Text>
              <Text>{t("p2")}</Text>
              <Text>{t("p3")}</Text>
              <Text>{t("p4")}</Text>
              <Text>{t("p5")}</Text>
              <div>
                <Text>
                  <span>{t("p6")}</span>
                  <a href="https://samourai.world" className="mx-[6px]">
                    <span className="text-blue-600">Samourai.world</span>
                  </a>
                  <span>{t("p6-end")}</span>
                </Text>
                <Text variant="secondary">{t("p6-ref")}</Text>
              </div>
              <div>
                <Text>{t("p7")}</Text>
                <a href="https://www.zenao.io">
                  <Text className="text-orange-600">www.zenao.io</Text>
                </a>
              </div>
            </div>
          </Card>
        </div>
        <div className="sm:w-1/3" />
      </div>
    </ScreenContainerCentered>
  );
}
