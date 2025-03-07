"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import Image from "next/image";
import { userFromAddress } from "@/lib/queries/user";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { web2URL } from "@/lib/uris";
import { Text } from "@/components/texts/DefaultText";
import { Card } from "@/components/cards/Card";

export function ProfileInfo({ address }: { address: string }) {
  const { data } = useSuspenseQuery(userFromAddress(address));

  // userFromAddress return array of empty string (except address)
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
        <Image
          src={web2URL(data.avatarUri)}
          width={330}
          height={330}
          alt="Event"
          priority
          className="flex w-full rounded-xl self-center"
        />
      </div>
      <div className="flex flex-col gap-4 w-full sm:w-3/5">
        <VeryLargeText className="mb-7">{data.displayName}</VeryLargeText>
        <Card>
          <Text>{data.bio}</Text>
        </Card>
      </div>
    </div>
  );
}
