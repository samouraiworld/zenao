import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/widgets/cards/card";
import { communityInfo } from "@/lib/queries/community";
import { cn } from "@/lib/tailwind";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Web3Image } from "@/components/widgets/images/web3-image";
import Text from "@/components/widgets/texts/text";

interface EventCommunitySectionProps {
  communityId: string;
}

export default function EventCommunitySection({
  communityId,
}: EventCommunitySectionProps) {
  const { data: community } = useSuspenseQuery(communityInfo(communityId));
  const t = useTranslations("event-community-section");

  return (
    <Link href={`/community/${communityId}`}>
      <Card className="flex items-start gap-4 cursor-pointer hover:bg-secondary/50 transition-colors">
        <Avatar
          className={cn("rounded overflow-hidden inline-block w-12 h-12")}
        >
          <AvatarFallback>
            <Web3Image
              src={community.avatarUri}
              width={48}
              height={48}
              quality={80}
              alt="Community Avatar"
              className="w-full h-full object-cover"
            />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <Text variant="secondary" size="sm">
            {t("organized-by")}
          </Text>
          <Text size="lg" className="font-medium">
            {community.displayName}
          </Text>
        </div>
      </Card>
    </Link>
  );
}
