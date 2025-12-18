import Link from "next/link";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { EventImage } from "@/components/features/event/event-image";

interface BlogPostCardProps {
  title: string;
  description: string;
  date: Date;
  previewImageUrl?: string;
  slug: string;
}

export default function BlogPostCard({
  title,
  description,
  slug,
  previewImageUrl,
}: BlogPostCardProps) {
  const { alt, ...imageProps } = previewImageUrl
    ? {
        src: previewImageUrl,
        alt: `${title} post image background`,
      }
    : {
        src: "/zenao-logo.png",
        alt: "Zenao logo",
      };
  return (
    <Link href={`/blog/${slug}`} className="w-full max-w-md h-full">
      <Card className="flex flex-col h-full gap-8 hover:bg-secondary/60 transition-colors">
        <EventImage
          {...imageProps}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
          className="group-hover:opacity-80"
          quality={60}
        />
        <div className="flex flex-col h-full gap-4">
          <Heading level={2} size="xl">
            {title}
          </Heading>
          <Text>{description}</Text>
        </div>
      </Card>
    </Link>
  );
}
