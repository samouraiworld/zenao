import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";

import { UserAvatar } from "../user/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { UserProfile } from "@/lib/queries/profile";

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

export function AccountModeSwitcher({
  user,
  realmId,
}: {
  readonly user: UserProfile;
  readonly realmId: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={avatarClassName}>
          <UserAvatar realmId={realmId} className={avatarClassName} size="md" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 space-y-1 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
          <div className={avatarClassName}>
            <UserAvatar
              realmId={realmId}
              className={avatarClassName}
              size="md"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user.displayName}</span>
            <span className="truncate text-xs">{realmId}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
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
  );
}
