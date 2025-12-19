import PostDate from "./post-date";
import PostShare from "./post-share";
import { EventImage } from "@/components/features/event/event-image";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";

interface PostHeaderProps {
  slug: string;
  category: string;
  title: string;
  description: string;
  previewImageUrl?: string;
  author: string;
  publishedAt: Date;
}

export default function PostHeader({
  slug,
  category,
  title,
  description,
  previewImageUrl,
  author,
  publishedAt,
}: PostHeaderProps) {
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
    <div className="flex flex-col gap-4">
      <Text className="text-main font-semibold">{category}</Text>

      <Heading level={1} className="text-4xl">
        {title}
      </Heading>
      <Heading level={2} variant="secondary" className="text-lg font-semibold">
        {description}
      </Heading>

      <EventImage
        {...imageProps}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
        quality={80}
      />
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-2">
          <Text className="font-semibold">{author}</Text>
          <Text variant="secondary">•</Text>
          <PostDate date={publishedAt} />
        </div>
        <PostShare slug={slug} title={title} />
      </div>
      <Separator color="#EC7E17" />
    </div>
  );
}
