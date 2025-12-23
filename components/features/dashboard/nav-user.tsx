"use client";

import {
  EllipsisVertical,
  CircleUser,
  CreditCard,
  MessageSquareDot,
  LogOut,
} from "lucide-react";

import { ClerkLoading } from "@clerk/nextjs";
import { SignedIn } from "@clerk/clerk-react";

import { UserAvatar, UserAvatarSkeleton } from "../user/user";
import { UserProfile } from "@/lib/queries/profile";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

type NavUserProps = {
  readonly realmId: string;
  readonly user: UserProfile;
};

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

export function NavUser({ realmId, user }: NavUserProps) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-full"
            >
              <div>
                <ClerkLoading>
                  <div className={avatarClassName}>
                    <UserAvatarSkeleton className={avatarClassName} />
                  </div>
                </ClerkLoading>
                {/* Signed in state */}
                <SignedIn>
                  <div className={avatarClassName}>
                    <UserAvatar
                      realmId={realmId}
                      className={avatarClassName}
                      size="md"
                    />
                  </div>
                </SignedIn>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {realmId}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <ClerkLoading>
                  <div className={avatarClassName}>
                    <UserAvatarSkeleton className={avatarClassName} />
                  </div>
                </ClerkLoading>
                {/* Signed in state */}
                <SignedIn>
                  <div className={avatarClassName}>
                    <UserAvatar
                      realmId={realmId}
                      className={avatarClassName}
                      size="md"
                    />
                  </div>
                </SignedIn>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.displayName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {realmId}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquareDot />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
