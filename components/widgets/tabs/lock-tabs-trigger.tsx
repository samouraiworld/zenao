import React from "react";
import { Lock } from "lucide-react";
import { TabsTrigger } from "@/components/shadcn/tabs";

interface RoleLockTabsTriggerProps<T extends string> {
  allowedRoles: T[];
  roles: T[];
  children: React.ReactNode | null;
  value: string;
}

export default function RoleLockTabsTrigger<T extends string>({
  allowedRoles,
  roles,
  value,
  children = null,
}: RoleLockTabsTriggerProps<T>) {
  const isAllowed = roles.some((role) => allowedRoles.includes(role));

  return (
    <TabsTrigger
      value={value}
      className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80 data-[state=locked]:cursor-not-allowed data-[state=locked]:opacity-50 data-[state=locked]:pointer-events-none"
      {...(isAllowed ? {} : { "data-state": "locked" })}
    >
      <Lock className="mr-2 h-4 w-4" />
      {children}
    </TabsTrigger>
  );
}
