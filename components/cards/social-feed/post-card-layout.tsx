import { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Text } from "@/components/texts/DefaultText";
import { Card } from "@/components/cards/Card";
import { userAddressOptions, userOptions } from "@/lib/queries/user";
import { AvatarWithLoaderAndFallback } from "@/components/common/Avatar";
import { textareaMinHeight } from "@/app/event/[id]/event-feed";

export function PostCardLayout({ children }: { children: ReactNode }) {
  const { getToken, userId } = useAuth();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(userOptions(address));

  return (
    <div className="flex flex-row gap-4">
      {/*TODO: post auhor here*/}
      <div className="flex items-center" style={{ height: textareaMinHeight }}>
        <AvatarWithLoaderAndFallback user={user} />
      </div>

      <Card className="w-full flex flex-col gap-2">
        {children}

        {/* TODO: Footer here (Reactions, comments, tips, etc)*/}
        <div className="flex flex-row items-center justify-between">
          <Text>xx xxxxxxxxxxxxxx xx</Text>
          <Text>xx xx xx xx xx xx</Text>
        </div>
      </Card>
    </div>
  );
}
