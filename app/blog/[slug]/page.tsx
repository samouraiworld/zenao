import { notFound } from "next/navigation";
import { getPostContent, getPostsMetadata } from "@/lib/blog";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import MarkdownRenderer from "@/components/common/markdown/markdown-renderer";

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
    title: `${post?.data.title}| Zenao`,
    description: post?.data.description,
  };
}

export default async function Post({ params }: Props) {
  const { slug } = await params;
  const post = await getPostContent(slug);

  if (!post) {
    notFound();
  }

  return (
    <ScreenContainer>
      <MarkdownRenderer md={post.content} />
    </ScreenContainer>
  );
}
