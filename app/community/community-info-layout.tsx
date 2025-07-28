"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMediaQuery } from "../../hooks/use-media-query";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { communityInfo } from "@/lib/queries/community";

type CommunityInfoLayoutProps = {
  communityId: string;
  children: React.ReactNode;
};

function CommunityInfoLayout({
  communityId,
  children,
}: CommunityInfoLayoutProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { data } = useSuspenseQuery(communityInfo(communityId));

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="relative w-full">
        <AspectRatio ratio={isDesktop ? 48 / 9 : 21 / 9}>
          <Web3Image
            className="rounded w-full h-full self-center object-cover"
            alt="Community hero img"
            src={data.bannerUri}
            priority
            fetchPriority="high"
            fill
            quality={70}
          />
        </AspectRatio>

        <div className="w-[96px] md:w-[128px] absolute -bottom-14 left-4 md:left-10">
          <AspectRatio ratio={1}>
            <Web3Image
              className="rounded h-full self-center object-cover"
              src={data.avatarUri}
              alt="Community profile img"
              priority
              fetchPriority="high"
              fill
              sizes="(max-width: 768px) 100vw,
                  (max-width: 1200px) 50vw,
                  33vw"
            />
          </AspectRatio>
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-8">
        <div className="flex justify-between">
          <div className="flex flex-col">
            <Heading level={1} className="text-2xl">
              {data.displayName}
            </Heading>
          </div>

          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/communities/c${communityId}`}
            className="max-md:hidden"
          />
        </div>

        <Text>{data.description}</Text>

        <GnowebButton
          href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/communities/c${communityId}`}
          className="w-full md:hidden"
        />
      </div>

      {children}
    </div>
  );
}

export default CommunityInfoLayout;
