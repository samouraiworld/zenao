import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/cards/Card";
import Text from "@/components/texts/text";
import Heading from "@/components/texts/heading";

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
        className:
          "absolute top-0 left-0 w-full h-full object-cover rounded-lg",
      }
    : {
        src: "/zenao-logo.png",
        alt: "Zenao logo",
        className: "w-16 h-16",
      };
  return (
    <Link href={`/blog/${slug}`} className="w-full max-w-md h-full">
      <Card className="flex flex-col h-full gap-8 hover:bg-secondary/60 transition-colors">
        <div className="flex relative aspect-[16/7] justify-center items-center bg-background rounded-lg">
          <Image alt={alt} width={800} height={800} {...imageProps} />
        </div>
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
