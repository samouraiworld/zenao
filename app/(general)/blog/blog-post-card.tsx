import Link from "next/link";
import PostDate from "./[slug]/post-date";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import Heading from "@/components/widgets/texts/heading";
import { EventImage } from "@/components/features/event/event-image";

interface BlogPostCardProps {
  title: string;
  description: string;
  author: string;
  category: string;
  previewImageUrl?: string;
  slug: string;
  publishedAt: Date;
}

export default function BlogPostCard({
  title,
  author,
  description,
  category,
  slug,
  previewImageUrl,
  publishedAt,
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
    <Link href={`/blog/${slug}`} className="w-full h-full">
      <Card
        role="group"
        className="flex flex-col h-full gap-8 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex flex-col gap-2">
          <Text size="sm" className="text-main font-semibold">
            {category}
          </Text>
          <EventImage
            {...imageProps}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
            quality={60}
          />
        </div>
        <div className="flex flex-col h-full gap-4">
          <Heading level={2} size="xl" className="font-bold">
            {title}
          </Heading>
          <div className="flex-grow min-h-14">
            <Text variant="secondary">{description}</Text>
          </div>
          <div className="flex gap-2">
            <Text className="font-semibold">{author}</Text>
            <Text variant="secondary">•</Text>
            <PostDate date={publishedAt} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
