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
    <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col gap-4 w-full sm:w-2/5">
        {data.avatarUri ? (
          <Image
            src={data.avatarUri}
            width={330}
            height={330}
            alt="Event"
            priority
            className="flex w-full rounded-xl self-center"
            loader={web3ImgLoader}
          />
        ) : (
          <Skeleton className="flex w-full rounded-xl self-center" />
        )}
        <GnowebButton
          href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/cockpit:u/${data.address}`}
        />
      </div>
      <div className="flex flex-col gap-4 w-full sm:w-3/5">
        <Heading level={1} size="4xl" className="mb-7">
          {data.displayName}
        </Heading>
        <Card>
          <Text>{data.bio}</Text>
        </Card>
      </div>
    </div>
  );
}
