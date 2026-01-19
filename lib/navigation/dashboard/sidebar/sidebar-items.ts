import { Forklift, Calendar, type LucideIcon, BoxesIcon } from "lucide-react";
import { useMemo } from "react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  requiresPro?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?:
    | NavSubItem[]
    | ((pathname: string, id: string | undefined) => NavSubItem[] | undefined);
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  requiresPro?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const useSidebarItems: () => NavGroup[] = () =>
  useMemo(
    () => [
      {
        id: 1,
        label: "",
        items: [
          {
            title: "events",
            url: "/dashboard",
            icon: Calendar,
            subItems: (pathname, id) => {
              if (!id) return undefined;

              if (pathname.includes("/dashboard/event")) {
                return [
                  {
                    title: "all",
                    url: "/dashboard",
                  },
                  {
                    title: "general",
                    url: `/dashboard/event/${id}`,
                  },
                  {
                    title: "participants",
                    url: `/dashboard/event/${id}/participants`,
                  },
                  {
                    title: "gatekeepers",
                    url: `/dashboard/event/${id}/gatekeepers`,
                  },
                  {
                    title: "broadcast",
                    url: `/dashboard/event/${id}/broadcast`,
                    requiresPro: true,
                  },
                ];
              }
            },
          },
          {
            title: "communities",
            url: "/dashboard/community",
            icon: BoxesIcon,
            subItems: (pathname, id) => {
              if (!id) return undefined;

              if (pathname.includes("/dashboard/community")) {
                return [
                  { title: "all", url: "/dashboard/community" },
                  {
                    title: "general",
                    url: `/dashboard/community/${id}`,
                  },
                  {
                    title: "members",
                    url: `/dashboard/community/${id}/members`,
                  },
                  {
                    title: "administrators",
                    url: `/dashboard/community/${id}/administrators`,
                  },
                  {
                    title: "events",
                    url: `/dashboard/community/${id}/events`,
                  },
                  {
                    title: "payouts",
                    url: `/dashboard/community/${id}/payouts`,
                  },
                ];
              }
            },
          },
          {
            title: "settings",
            url: "/dashboard/coming-soon",
            icon: Forklift,
            comingSoon: true,
          },
        ],
      },
    ],
    [],
  );
