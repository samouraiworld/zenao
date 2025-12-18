import { notFound } from "next/navigation";
import PostHeader from "./post-header";
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
    <ScreenContainer
      background={{
        src: post.data.previewImageUrl ?? "/zenao-logo.png",
        width: 600,
        height: 600,
      }}
    >
      <div className="flex flex-col gap-12 mx-auto max-w-5xl sm:w-full pb-8 md:pb-12">
        <PostHeader
          slug={slug}
          title={post.data.title}
          description={post.data.description}
          previewImageUrl={post.data.previewImageUrl}
          author={post.data.author}
          publishedAt={new Date(post.data.date)}
        />

        <MarkdownPreview markdownString={post.content} className="gap-4" />
      </div>
    </ScreenContainer>
  );
}
