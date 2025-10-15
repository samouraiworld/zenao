import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, Link2, MapPin } from "lucide-react";
import Link from "next/link";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { Card } from "@/components/widgets/cards/card";
import { Web3Image } from "@/components/widgets/images/web3-image";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { addressFromRealmId } from "@/lib/gno";
import { userInfoOptions } from "@/lib/queries/user";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { gnoProfileDetailsSchema } from "@/types/schemas";

type ProfileHeaderProps = {
  address: string;
  displayName: string;
  avatarUri: string;
  bio: string;
};

export default function ProfileHeader({
  address,
  displayName,
  avatarUri,
  bio,
}: ProfileHeaderProps) {
  const { userId, getToken } = useAuth();
  const { data: info } = useSuspenseQuery(userInfoOptions(getToken, userId));
  const realmId = info?.realmId;
  const userLoggedAddress = addressFromRealmId(realmId);

  const profileDetails = deserializeWithFrontMatter({
    serialized: bio,
    schema: gnoProfileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
    },
    contentFieldName: "bio",
  });

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full">
        {profileDetails.bannerUri ? (
          <AspectRatio ratio={4 / 1}>
            <Web3Image
              src={profileDetails.bannerUri}
              alt="Profile banner"
              priority
              fill
              className="w-full h-full object-cover rounded-b-2xl"
            />
          </AspectRatio>
        ) : (
          <Skeleton className="w-full h-32 sm:h-48" />
        )}

        <div className="absolute -bottom-16 left-4">
          {avatarUri ? (
            <div className="relative w-24 h-24 sm:w-40 sm:h-40 rounded-full ring-4 ring-background shadow-md overflow-hidden">
              <Web3Image
                src={avatarUri}
                alt="Profile picture"
                priority
                fetchPriority="high"
                fill
                sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
                className="object-cover"
              />
            </div>
          ) : (
            <Skeleton className="flex w-full rounded-xl self-center" />
          )}
        </div>
      </div>

      <div className="mt-20 sm:mt-24 px-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Heading level={1} size="4xl">
              {displayName}
            </Heading>
            {profileDetails.shortBio && (
              <Text className="text-muted-foreground mt-1 text-lg">
                {profileDetails.shortBio}
              </Text>
            )}

            {profileDetails.location && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 mt-3">
                <MapPin size={16} />
                <Text className="text-sm">{profileDetails.location}</Text>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <GnowebButton
              href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/cockpit:u/${address}`}
              className="w-full sm:w-auto"
            />
            {userLoggedAddress === address && (
              <Link href="/settings" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Edit my profile</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {profileDetails.bio?.trim() && (
            <Card>
              <MarkdownPreview markdownString={profileDetails.bio} />
            </Card>
          )}
        </div>

        {profileDetails.socialMediaLinks?.length > 0 && (
          <div className="flex flex-col gap-3">
            <Heading level={2} size="lg" className="flex items-center gap-2">
              <Link2 size={18} className="text-primary" />
              Links
            </Heading>
            <ul className="flex flex-wrap gap-2">
              {profileDetails.socialMediaLinks.map((link) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border hover:border-blue-600/50 transition text-sm"
                  >
                    <span className="text-blue-500">{link.url}</span>
                    <ExternalLink
                      size={14}
                      className="flex-shrink-0 text-blue-400"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
