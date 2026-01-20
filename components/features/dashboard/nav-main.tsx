"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { PlusCircleIcon, ChevronRight, Users, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type NavMainItem,
  type NavGroup,
} from "@/lib/navigation/dashboard/sidebar/sidebar-items";
import { PlanType } from "@/types/schemas";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/shadcn/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

interface NavMainProps {
  readonly items: readonly NavGroup[];
  readonly userPlan?: PlanType;
}

const IsComingSoon = () => {
  const t = useTranslations("dashboard.sidebar");
  return (
    <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">
      {t("coming-soon")}
    </span>
  );
};

const RequiresPro = () => {
  const t = useTranslations("dashboard.sidebar");
  return (
    <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded">
      {t("pro")}
    </span>
  );
};

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
  userPlan = "free",
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
  userPlan?: PlanType;
}) => {
  const t = useTranslations("dashboard.sidebar");
  const path = usePathname();
  const { id } = useParams<{ id: string | undefined }>();
  const resolvedSubItems =
    typeof item.subItems === "function"
      ? item.subItems(path, id)
      : item.subItems;

  const shouldBeOpen = isSubmenuOpen(item.subItems);
  const [isOpen, setIsOpen] = useState(shouldBeOpen);
  const prevShouldBeOpen = useRef(shouldBeOpen);

  // Auto-expand menu when navigating to an event or community
  useEffect(() => {
    if (shouldBeOpen && !prevShouldBeOpen.current) {
      setIsOpen(true);
    }
    prevShouldBeOpen.current = shouldBeOpen;
  }, [shouldBeOpen]);

  return (
    <Collapsible
      key={item.title}
      asChild
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {resolvedSubItems ? (
            <SidebarMenuButton
              disabled={
                item.comingSoon || (item.requiresPro && userPlan !== "pro")
              }
              isActive={isActive(item.url, item.subItems)}
              tooltip={item.title}
            >
              {item.icon && <item.icon />}
              <span>{t(item.title)}</span>
              {item.comingSoon && <IsComingSoon />}
              {item.requiresPro && userPlan !== "pro" && <RequiresPro />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              aria-disabled={
                item.comingSoon || (item.requiresPro && userPlan !== "pro")
              }
              isActive={isActive(item.url)}
              tooltip={item.title}
            >
              <Link
                prefetch={false}
                href={item.url}
                target={item.newTab ? "_blank" : undefined}
              >
                {item.icon && <item.icon />}
                <span>{t(item.title)}</span>
                {item.comingSoon && <IsComingSoon />}
                {item.requiresPro && userPlan !== "pro" && <RequiresPro />}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {resolvedSubItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {resolvedSubItems?.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    aria-disabled={
                      subItem.comingSoon ||
                      (subItem.requiresPro && userPlan !== "pro")
                    }
                    isActive={isActive(subItem.url)}
                    asChild
                  >
                    <Link
                      prefetch={false}
                      href={subItem.url}
                      target={subItem.newTab ? "_blank" : undefined}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span>{t(subItem.title)}</span>
                      {subItem.comingSoon && <IsComingSoon />}
                      {subItem.requiresPro && userPlan !== "pro" && (
                        <RequiresPro />
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
  userPlan = "free",
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  userPlan?: PlanType;
}) => {
  const t = useTranslations("dashboard.sidebar");
  const pathname = usePathname();
  const { id } = useParams<{ id: string | undefined }>();

  const resolvedSubItems =
    typeof item.subItems === "function"
      ? item.subItems(pathname, id)
      : item.subItems;

  return (
    <SidebarMenuItem key={item.title}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            disabled={
              item.comingSoon || (item.requiresPro && userPlan !== "pro")
            }
            tooltip={item.title}
            isActive={isActive(item.url, item.subItems)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-50 space-y-1"
          side="right"
          align="start"
        >
          {resolvedSubItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.title} asChild>
              <SidebarMenuSubButton
                key={subItem.title}
                asChild
                className="focus-visible:ring-0"
                aria-disabled={
                  subItem.comingSoon ||
                  (subItem.requiresPro && userPlan !== "pro")
                }
                isActive={isActive(subItem.url)}
              >
                <Link
                  prefetch={false}
                  href={subItem.url}
                  target={subItem.newTab ? "_blank" : undefined}
                >
                  {subItem.icon && (
                    <subItem.icon className="[&>svg]:text-sidebar-foreground" />
                  )}
                  <span>{t(subItem.title)}</span>
                  {subItem.comingSoon && <IsComingSoon />}
                  {subItem.requiresPro && userPlan !== "pro" && <RequiresPro />}
                </Link>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items, userPlan = "free" }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile } = useSidebar();
  const { id } = useParams<{ id: string | undefined }>();
  const t = useTranslations("dashboard.sidebar");
  const tA11y = useTranslations("a11y");

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (typeof subItems === "function") {
      const resolvedSubItems = subItems(path, id);
      if (resolvedSubItems?.length) {
        return resolvedSubItems.some((sub) => path.startsWith(sub.url));
      }
      return path === url;
    }

    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    if (typeof subItems === "function") {
      const resolvedSubItems = subItems(path, id);
      return resolvedSubItems?.some((sub) => path.startsWith(sub.url)) ?? false;
    }
    return subItems?.some((sub) => path.startsWith(sub.url)) ?? false;
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    variant="outline"
                    tooltip={t("quick-create")}
                    aria-label={tA11y("quick-menu")}
                  >
                    <PlusCircleIcon />
                    <span>{t("create-btn")}</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <Link href="/dashboard/event/create">
                    <DropdownMenuItem>
                      <div className="flex">
                        <Calendar className="mr-2 h-5 w-5" />
                        <span className="mr-2">{t("create-event")}</span>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/community/create">
                    <DropdownMenuItem>
                      <div className="flex">
                        <Users className="mr-2 h-5 w-5" />
                        <span className="mr-2">{t("create-community")}</span>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => {
                if (state === "collapsed" && !isMobile) {
                  // If no subItems, just render the button as a link
                  if (
                    !item.subItems ||
                    (typeof item.subItems === "function" &&
                      !item.subItems(path, id))
                  ) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          aria-disabled={
                            item.comingSoon ||
                            (item.requiresPro && userPlan !== "pro")
                          }
                          tooltip={t(item.title)}
                          isActive={isItemActive(item.url)}
                        >
                          <Link
                            prefetch={false}
                            href={item.url}
                            target={item.newTab ? "_blank" : undefined}
                          >
                            {item.icon && <item.icon />}
                            <span>{t(item.title)}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  // Otherwise, render the dropdown as before
                  return (
                    <NavItemCollapsed
                      key={item.title}
                      item={item}
                      isActive={isItemActive}
                      userPlan={userPlan}
                    />
                  );
                }
                // Expanded view
                return (
                  <NavItemExpanded
                    key={item.title}
                    item={item}
                    isActive={isItemActive}
                    isSubmenuOpen={isSubmenuOpen}
                    userPlan={userPlan}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
