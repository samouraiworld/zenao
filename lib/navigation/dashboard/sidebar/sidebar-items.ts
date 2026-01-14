import { Calendar, type LucideIcon, BoxesIcon, Settings } from "lucide-react";
import { useMemo } from "react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
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
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const useSidebarItems: (isTeamContext: boolean) => NavGroup[] = (
  isTeamContext: boolean,
) =>
  useMemo(() => {
    return [
      {
        id: 1,
        label: "",
        items: [
          {
            title: "events",
            url: "/dashboard",
            icon: Calendar,
            subItems: (pathname: string, id: string | undefined) => {
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
                  /// XXX Later add gatekepers, broadcast tab with user role checking
                ];
              }
            },
          },
          {
            title: "communities",
            url: "/dashboard/community",
            icon: BoxesIcon,
            subItems: (pathname: string, id: string | undefined) => {
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
                ];
              }
            },
          },
        ].concat(
          isTeamContext
            ? [
                {
                  title: "teamSettings",
                  url: "/dashboard/team-settings",
                  icon: Settings,
                  subItems: () => undefined,
                },
              ]
            : [],
        ),
      },
    ];
  }, [isTeamContext]);
