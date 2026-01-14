import { IArticleIndex } from "seobot/dist/types/blog";
import Link from "next/link";
import PostDate from "./post-date";
import PostShare from "./post-share";
import { EventImage } from "@/components/features/event/event-image";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";

interface PostHeaderProps {
  slug: string;
  post: IArticleIndex;
}

export default function PostHeader({ slug, post }: PostHeaderProps) {
  const { alt, ...imageProps } = post.image
    ? {
        src: post.image,
        alt: `${post.headline} post image background`,
      }
    : {
        src: "/zenao-logo.png",
        alt: "Zenao logo",
      };

  return (
    <div className="flex flex-col gap-4">
      {post.category && (
        <Link href={`/blog/category/${post.category.slug}`}>
          <Text size="sm" className="text-main font-semibold">
            {post.category.title}
          </Text>
        </Link>
      )}

      <Heading level={1} className="text-4xl">
        {post.headline}
      </Heading>
      <Heading level={2} variant="secondary" className="text-lg font-semibold">
        {post.metaDescription}
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
          <PostDate date={new Date(post.publishedAt || post.createdAt)} />
          {post.readingTime ? (
            <>
              <Text variant="secondary">•</Text>
              <Text className="font-semibold">{post.readingTime} min read</Text>
            </>
          ) : null}
        </div>
        <PostShare slug={slug} title={post.headline} />
      </div>
      <Separator color="#EC7E17" />
    </div>
  );
}
