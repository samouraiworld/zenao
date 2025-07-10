"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Url } from "next/dist/shared/lib/router/router";
import { buttonVariants } from "../../shadcn/button";
import Text from "../texts/text";
import { Web3Image } from "../images/web3-image";
import { cn } from "@/lib/tailwind";

interface GnowebButtonProps {
  href: Url;
  label?: string;
  className?: string;
}

export const GnowebButton: React.FC<GnowebButtonProps> = ({
  href,
  label,
  className,
}) => {
  const t = useTranslations("components.buttons");

  return (
    <Link
      className={cn(
        buttonVariants({ variant: "secondary" }),
        "w-max",
        className,
      )}
      href={href}
      target="_blank"
    >
      <Text variant="secondary" size="sm">
        {label || t("gnoweb-button")}
      </Text>
      <Web3Image
        src="/gno1.png"
        alt="gno-logo"
        width={25}
        height={25}
        className="rounded-[25px]"
      />
    </Link>
  );
};
