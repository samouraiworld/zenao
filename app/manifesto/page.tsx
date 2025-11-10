import React from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import Image from "next/image";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import { Web3Image } from "@/components/widgets/images/web3-image";

export default function Manifesto() {
  const t = useTranslations("manifesto");
  const t2 = useTranslations("whitepaper");

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col justify-center lg:flex-row">
        <div className="w-full flex justify-center my-10 lg:my-0 lg:w-1/3 lg:self-center lg:justify-evenly">
          <Image
            src="/zenao-logo.png"
            alt="zenao logo"
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
                <span className="text-secondry-color font-light italic">
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

      <Card className="mt-10 p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-row gap-2">
            <FileText className="text-secondary-color" width={15} />
            <Text variant="secondary" className="font-light">
              {t2("title")}
            </Text>
          </div>
          <div className="my-6 flex flex-col gap-4">
            <Text>
              <span className="font-bold">{t2("vision-title")}</span>
            </Text>
            <Text size="sm">{t2("vision-p1")}</Text>
            <Text size="sm">{t2("vision-p2")}</Text>
            <Text size="sm">{t2("vision-p3")}</Text>
            <Text size="sm">{t2("vision-p4")}</Text>
          </div>
          <div className="flex flex-col gap-4">
            <Text>
              <span className="font-bold">{t2("product-title")}</span>
            </Text>
            <Text size="sm">{t2("product-p1")}</Text>
            <Text size="sm">{t2("product-p2")}</Text>
            <Text size="sm">{t2("product-p3")}</Text>
            <Text>
              <span className="font-semibold">
                {t2("product-features-title")}
              </span>
            </Text>
            <ul className="list-disc ml-6 text-sm">
              {t2
                .raw("product-features-list")
                .map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
            </ul>

            <Text>
              <span className="font-semibold">
                {t2("product-upcoming-title")}
              </span>
            </Text>
            <ul className="list-disc ml-6 text-sm">
              {t2
                .raw("product-upcoming-list")
                .map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
            </ul>
          </div>

          <div className="my-6 flex flex-col gap-4">
            <Text>
              <span className="font-bold"> {t2("gov-title")}</span>
            </Text>
            <Text size="sm" className="font-bold">
              {t2("gov-actors-title")}
            </Text>

            <Text size="sm" className="font-semibold">
              {t2("gov-actors-p1")}
            </Text>
            <ul className="list-disc ml-6 text-sm">
              {t2.raw("gov-actors-list").map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            <Text size="sm">{t2("gov-actors-example")}</Text>
            <Text size="sm" className="font-bold">
              {t2("gov-arch-title")}
            </Text>
            <Text size="sm">{t2("gov-arch-p1")}</Text>
            <ul className="list-disc ml-6 text-sm">
              {t2.raw("gov-arch-list").map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            <Text size="sm">{t2("gov-arch-p2")}</Text>
            <Text size="sm">{t2("gov-arch-p3")}</Text>
          </div>

          <div>
            <Text size="sm" className="font-semibold italic">
              <a
                href="https://github.com/samouraiworld/gnodaokit"
                className="mx-[6px]"
              >
                <span>{t2("gov-arch-doc")}</span>
              </a>
            </Text>
          </div>

          <Web3Image
            className="object-cover rounded"
            alt="zenao arch"
            width={1000}
            height={300}
            src="https://ipfs.io/ipfs/bafybeigirez6x4hn5ghchng5eoxoi2bkcglaybuz4np6joub6zja5om6l4"
            priority
            fetchPriority="high"
            quality={70}
          />

          <div className="my-6 flex flex-col gap-4">
            <Text>
              <span className="font-bold">{t2("story-title")}</span>
            </Text>
            <Text size="sm">{t2("story-p1")}</Text>
            <Text size="sm">{t2("story-p2")}</Text>

            <Text className="font-semibold">
              {t2("story-community-actions-title")}
            </Text>
            <ul className="list-decimal ml-6 text-sm">
              {t2
                .raw("story-community-actions-list")
                .map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
            </ul>

            <Text className="font-semibold">{t2("story-community-title")}</Text>
            <ul className="list-disc ml-6 text-sm">
              {t2
                .raw("story-community-list")
                .map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
            </ul>

            <Text className="font-semibold">{t2("story-tools-title")}</Text>
            <ul className="list-disc ml-6 text-sm">
              {t2.raw("story-tools-list").map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>

            <Text className="font-semibold">{t2("story-organizer-title")}</Text>
            <ul className="list-disc ml-6 text-sm">
              {t2
                .raw("story-organizer-list")
                .map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
            </ul>

            <Text className="font-semibold">
              {t2("story-community-member-title")}
            </Text>
            <ul className="list-disc ml-6 text-sm">
              {t2
                .raw("story-community-member-list")
                .map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
            </ul>

            <Text className="font-semibold">{t2("story-others-title")}</Text>
            <ul className="list-disc ml-6 text-sm">
              {t2.raw("story-others-list").map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <Text>
              <span className="font-bold">{t2("roadmap-title")}</span>
            </Text>
            <Text size="sm">{t2("roadmap-p1")}</Text>
            <Text size="sm">{t2("roadmap-p2")}</Text>
            <Text size="sm">{t2("roadmap-p3")}</Text>
            <Text size="sm">{t2("roadmap-p4")}</Text>
            <Text>
              <span className="font-bold">&quot;{t("p7")}&quot;</span>
            </Text>
          </div>
        </div>
      </Card>
    </ScreenContainerCentered>
  );
}
