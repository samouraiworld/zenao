"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Organization, WithContext } from "schema-dts";
import { ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { communityInfo } from "@/lib/queries/community";
import { CommunityLeaveButton } from "@/components/community/community-leave-button";
import { CommunityJoinButton } from "@/components/community/community-join-button";
import { CommunityEditAdminButton } from "@/components/community/community-edit-button";
import { web2URL } from "@/lib/uris";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { communityDetailsSchema } from "@/types/schemas";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

type CommunityInfoLayoutProps = {
  communityId: string;
  children: React.ReactNode;
};

function CommunityInfoLayout({
  communityId,
  children,
}: CommunityInfoLayoutProps) {
  const { data } = useSuspenseQuery(communityInfo(communityId));

  const { description, shortDescription, socialMediaLinks } =
    deserializeWithFrontMatter({
      serialized: data.description || "",
      schema: communityDetailsSchema,
      defaultValue: {
        description: "",
        shortDescription: "",
        socialMediaLinks: [],
        portfolio: [],
      },
      contentFieldName: "description",
    });

  const jsonLd: WithContext<Organization> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.displayName,
    description: shortDescription || description || "",
    logo: {
      "@type": "ImageObject",
      url: web2URL(data.avatarUri),
    },
    image: [web2URL(data.bannerUri)],
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative w-full">
        <AspectRatio ratio={4 / 1}>
          <Web3Image
            className="rounded w-full h-full self-center object-cover"
            alt="Community hero img"
            src={
              data.bannerUri.length > 0
                ? data.bannerUri
                : "ipfs://bafybeib2gyk2yagrcdrnhpgbaj6an6ghk2liwx2mshhoa6d54y2mheny24"
            }
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

      <div className="mt-16 flex flex-col gap-6">
        <div className="flex justify-between">
          <div className="flex flex-col">
            <Heading level={1} className="text-2xl">
              {data.displayName}
            </Heading>
          </div>

          <div className="flex gap-2 max-md:hidden">
            <CommunityEditAdminButton communityId={communityId} />
            <CommunityJoinButton communityId={communityId} />
            <CommunityLeaveButton communityId={communityId} />
          </div>
        </div>

        <MarkdownPreview markdownString={description} />

        {socialMediaLinks.length > 0 && (
          <div className="flex flex-col gap-3">
            <Heading level={2} size="lg" className="flex items-center gap-2">
              <Link2 size={18} className="text-primary" />
              Links
            </Heading>
            <ul className="flex flex-wrap gap-2">
              {socialMediaLinks.map((link) => (
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

        <div className="flex flex-col md:hidden gap-2">
          <div className="flex flex-col gap-2 justify-center">
            <CommunityEditAdminButton communityId={communityId} />
            <CommunityJoinButton communityId={communityId} />
            <CommunityLeaveButton communityId={communityId} />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

export default CommunityInfoLayout;
