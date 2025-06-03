import { GnowebButton } from "@/components/buttons/gnoweb-button";
import { Card } from "@/components/cards/Card";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Skeleton } from "@/components/shadcn/skeleton";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { Web3Image } from "@/components/images/web3-image";

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
  return (
    <>
      <div className="flex flex-col gap-4 w-full sm:w-1/5">
        {avatarUri ? (
          <AspectRatio ratio={1 / 1}>
            <Web3Image
              src={avatarUri}
              alt="Event"
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
