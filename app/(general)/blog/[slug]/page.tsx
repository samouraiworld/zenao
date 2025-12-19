import { notFound } from "next/navigation";
import { PostPublishedAt } from "./post-published-at";
import { getPostContent, getPostsMetadata } from "@/lib/blog";
import { ScreenContainer } from "@/components/layout/screen-container";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

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
