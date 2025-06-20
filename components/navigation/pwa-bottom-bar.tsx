"use client";

import { BookOpenText, CompassIcon, Tickets } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { NavItem } from "./header";

function PwaBottomBar() {
  const t = useTranslations("navigation");
  const pathname = usePathname();

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

  return (
    <div className="hidden standalone:flex w-full h-bottom-bar fixed bottom-0 left-0 right-0 z-[100] items-center justify-between bg-main px-8 pointer-events-auto shadow-md md:hidden">
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
        className={`flex flex-col gap-1 items-center text-sm font-semibold ${
          isActive ? "text-white" : "text-black hover:text-white"
        }`}
      >
        <item.icon className="h-5 w-5" />
        <span className="text-inherit">{item.children}</span>
      </div>
    </Link>
  );
};

export default PwaBottomBar;
