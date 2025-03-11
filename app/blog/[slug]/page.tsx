import { notFound } from "next/navigation";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { getPostContent, getPostsMetadata } from "@/lib/blog";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import Text from "@/components/texts/text";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getPostsMetadata();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostContent(slug);

  return {
    title: `${post?.data.title} | Zenao`,
    description: post?.data.description,
  };
}

const PostPublishedAt = ({ publishedAt }: { publishedAt: Date }) => {
  const t = useTranslations("blog");

  return (
    <Text className="self-start text-gray-500">
      {t("publishedAt")}: {format(new Date(publishedAt), "dd-MM-yyyy")}
    </Text>
  );
};

export default async function Post({ params }: Props) {
  const { slug } = await params;
  const post = await getPostContent(slug);

  if (!post) {
    notFound();
  }

  return (
    <ScreenContainer>
      <div className="flex justify-center">
        <div className="w-fit flex flex-col items-center gap-4">
          <PostPublishedAt publishedAt={new Date(post.data.date)} />
          <MarkdownPreview markdownString={post.content} />
        </div>
      </div>
    </ScreenContainer>
  );
}
