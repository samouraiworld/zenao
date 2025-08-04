import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { Card } from "@/components/widgets/cards/card";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Skeleton } from "@/components/shadcn/skeleton";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { Button } from "@/components/shadcn/button";
import { userAddressOptions } from "@/lib/queries/user";

type ProfileHeaderProps = {
  address: string;
  displayName?: string;
  avatarUri?: string;
  bio?: string;
};

export default function ProfileHeader({
  address,
  displayName,
  avatarUri,
  bio,
}: ProfileHeaderProps) {
  const { userId, getToken } = useAuth();
  const { data: userLoggedAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  return (
    <>
      <div className="flex flex-col gap-4 w-full sm:w-1/5">
        {avatarUri ? (
          <AspectRatio ratio={1 / 1}>
            <Web3Image
              src={avatarUri}
              alt="Profile picture"
              priority
              fetchPriority="high"
              fill
              sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"
              className="flex w-full rounded-xl self-center object-cover"
            />
          </AspectRatio>
        ) : (
          <Skeleton className="flex w-full rounded-xl self-center" />
        )}
        <GnowebButton
          href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/cockpit:u/${address}`}
          className="w-full"
        />
        {userLoggedAddress === address && (
          <Link href="/settings">
            <Button className="w-full">Edit my profile</Button>
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-8 sm:gap-12 w-full sm:w-4/5">
        <Heading level={1} size="4xl">
          {displayName}
        </Heading>
        <Card>
          <Text>{bio}</Text>
        </Card>
      </div>
    </>
  );
}
