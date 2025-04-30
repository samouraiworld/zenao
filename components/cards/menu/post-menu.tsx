"use client";

import { Url } from "next/dist/shared/lib/router/router";
import * as React from "react";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

type PostMenu = {
  gnowebHref: Url;
};

export function PostMenu({ gnowebHref }: PostMenu) {
  const t = useTranslations("components.buttons");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="px-2">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        <Link href={gnowebHref}>
          <DropdownMenuItem>{t("gnoweb-button")}</DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
