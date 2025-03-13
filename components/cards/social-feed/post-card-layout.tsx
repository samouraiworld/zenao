import { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Text } from "@/components/texts/DefaultText";
import { Card } from "@/components/cards/Card";
import { userAddressOptions } from "@/lib/queries/user";
import { textareaMinHeight } from "@/app/event/[id]/event-feed";
import { UserLinkedAvatarWithLoaderAndFallback } from "@/components/common/user";

export function PostCardLayout({ children }: { children: ReactNode }) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  return (
    <div className="flex flex-row gap-4">
      {/*TODO: post auhor here*/}
      <div className="flex items-center" style={{ height: textareaMinHeight }}>
        <UserLinkedAvatarWithLoaderAndFallback userAddress={userAddress} />
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
