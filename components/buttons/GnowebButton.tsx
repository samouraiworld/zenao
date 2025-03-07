"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Url } from "next/dist/shared/lib/router/router";
import { Button } from "../shadcn/button";
import { SmallText } from "../texts/SmallText";

interface GnowebButtonProps {
  href: Url;
  label?: string;
}

export const GnowebButton: React.FC<GnowebButtonProps> = ({ href, label }) => {
  const t = useTranslations("components.buttons");

  return (
    <Button variant="secondary" className="w-max">
      <Link href={href} target="_blank">
        <SmallText variant="secondary">{label || t("gnoweb-button")}</SmallText>
      </Link>
      <Image
        src="/gno1.png"
        alt="gno-logo"
        width={25}
        height={25}
        className="rounded-[25px]"
      />
    </Button>
  );
};
