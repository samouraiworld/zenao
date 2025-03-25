"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import Image from "next/image";
import { Card } from "@/components/cards/Card";
import { web3ImgLoader } from "@/lib/web3-img-loader";
import { Skeleton } from "@/components/shadcn/skeleton";
import { GnowebButton } from "@/components/buttons/GnowebButton";
import { profileOptions } from "@/lib/queries/profile";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";

export function ProfileInfo({ address }: { address: string }) {
  const { data } = useSuspenseQuery(profileOptions(address));

  // profileOptions can return array of object with empty string (except address)
  // So to detect if a user doesn't exist we have to check if all strings are empty (except address)
  if (!data?.bio && !data?.displayName && !data?.avatarUri) {
    return <p>{`Profile doesn't exist`}</p>;
  }

  const jsonLd: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    alternateName: data?.displayName,
    image: data?.avatarUri,
    knowsAbout: data?.bio,
  };
  return (
    <div className="flex flex-col gap-4 w-full sm:h-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Card className="w-full py-4 sm:py-8">
        <div className="flex flex-col w-full items-center gap-8">
          {data.avatarUri ? (
            <div className="w-full max-w-[256px] sm:w-[256px]">
              <AspectRatio ratio={1 / 1}>
                <Image
                  src={data.avatarUri}
                  alt="Event"
                  priority
                  fill
                  sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 30vw,
              33vw"
                  className="flex rounded-xl self-center object-cover"
                  loader={web3ImgLoader}
                />
              </AspectRatio>
            </div>
          ) : (
            <Skeleton className="flex w-full rounded-xl self-center" />
          )}
          <div className="flex flex-col items-center gap-2">
            <Heading level={1} size="3xl">
              {data.displayName}
            </Heading>
            <Text>{data.bio}</Text>
          </div>
        </div>
      </Card>
      <GnowebButton
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/cockpit:u/${data.address}`}
      />
    </div>
  );
}
