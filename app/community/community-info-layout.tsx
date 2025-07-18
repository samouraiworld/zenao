"use client";
import { useMediaQuery } from "../hooks/use-media-query";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { Web3Image } from "@/components/widgets/images/web3-image";

type CommunityInfoLayoutProps = {
  children: React.ReactNode;
};

function CommunityInfoLayout({ children }: CommunityInfoLayoutProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="relative w-full">
        <AspectRatio ratio={isDesktop ? 48 / 9 : 21 / 9}>
          <Web3Image
            className="rounded w-full h-full self-center object-cover"
            alt="Community hero img"
            src="ipfs://bafybeidrcgelzhfblffpsmo6jukdnzmvae7xhu5zud4nn3os6qzdxbesu4"
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
              // TODO use uri
              src="ipfs://bafybeidrbpiyfvwsel6fxb7wl4p64tymnhgd7xnt3nowquqymtllrq67uy"
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
              HyperHactive
            </Heading>
            <Text className="text-secondary-color">@village.tori</Text>
          </div>

          {/* TODO update URL  */}
          <GnowebButton href={"http://localhost"} className="max-md:hidden" />
        </div>

        <Text>
          {`
            The first Teritori DAO for early community members, built on top of Teritori OS.\n
This decentralized organization's goal is to experiment an open, fun, and innovative way of governance that could support, encourage, fund, promote, all forms of projects voted by members.\n\n

Constitution:\n
#1: Don't be a d%ck.\n
#2: Everyone is welcome.\n
#3: One membership for one human.\n
#4: Have fun.\n
#5: Build together.\n
#6: This constitution can be updated using proposals.\n\n

Welcome to the village.\n
            `}
        </Text>

        {/* TODO update URL  */}
        <GnowebButton href={"http://localhost"} className="w-full md:hidden" />
      </div>

      {children}
    </div>
  );
}

export default CommunityInfoLayout;
