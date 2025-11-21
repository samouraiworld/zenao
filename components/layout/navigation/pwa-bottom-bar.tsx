"use client";

import { BookOpenText, BoxesIcon, CompassIcon, Tickets } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { NavItem } from "./header";
import { usePwaContext } from "@/components/providers/pwa-state-provider";
import { cn } from "@/lib/tailwind";

function PwaBottomBar() {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const { displayBottomBar } = usePwaContext();

  const navItems: NavItem[] = useMemo(
    () => [
      {
        key: "discover",
        to: "/discover",
        icon: CompassIcon,
        needsAuth: false,
        children: t("discover"),
      },
      {
        key: "communities",
        to: "/communities",
        icon: BoxesIcon,
        needsAuth: false,
        children: t("communities"),
      },

      {
        key: "tickets",
        to: "/tickets",
        icon: Tickets,
        needsAuth: false,
        children: t("your-tickets"),
      },
      {
        key: "manifesto",
        to: "/manifesto",
        icon: BookOpenText,
        needsAuth: false,
        children: t("manifesto"),
      },
    ],
    [t],
  );

  if (!displayBottomBar) {
    return null;
  }

  return (
    <div
      className={cn(
        "hidden standalone:flex w-full h-bottom-bar fixed bottom-0 left-0 right-0 z-[100] items-center justify-between bg-main px-6 sm:px-8 gap-2 pointer-events-auto shadow-md md:hidden",
      )}
    >
      {navItems.map((item) => {
        return <PwaNavLink key={item.key} item={item} pathname={pathname} />;
      })}
    </div>
  );
}

const PwaNavLink = ({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) => {
  const isActive = pathname === item.to;

  return (
    <Link href={item.to}>
      <div
        className={`flex flex-col gap-1 items-center text-[10px] font-semibold ${
          isActive ? "text-white" : "text-black hover:text-white"
        }`}
      >
        <item.icon className="h-4 w-4" />
        <span className="text-inherit">{item.children}</span>
      </div>
    </Link>
  );
};

export default PwaBottomBar;
