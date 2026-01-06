import { notFound } from "next/navigation";
import { BlogClient } from "seobot";
import { Metadata } from "next";
import Link from "next/link";
import PostHeader from "./post-header";
import { ScreenContainer } from "@/components/layout/screen-container";
import Heading from "@/components/widgets/texts/heading";

async function getPost(slug: string) {
  const key = process.env.SEOBOT_API_KEY;
  if (!key)
    throw Error(
      "SEOBOT_API_KEY enviroment variable must be set. You can use the DEMO key a8c58738-7b98-4597-b20a-0bb1c2fe5772 for testing - please set it in the root .env.local file",
    );

  const client = new BlogClient(key);
  return client.getArticle(slug);
}

export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return {};

  const title = post.headline;
  const description = post.metaDescription;
  return {
    title,
    description,
    metadataBase: new URL("https://zenao.io"),
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      type: "article",
      title,
      description,
      images: [post.image],
      url: `https://zenao.io/blog/${slug}`,
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      images: [post.image],
    },
  };
}

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <ScreenContainer
      background={{
        src: post.image ?? "/zenao-logo.png",
        width: 600,
        height: 600,
      }}
    >
      <div className="flex flex-col gap-12 mx-auto max-w-5xl sm:w-full pb-8 md:pb-12">
        <PostHeader slug={slug} post={post} />
        <div
          className="prose !max-w-5xl prose-h1:text-main prose-h2:text-main prose-h3:text-main prose-strong:text-main dark:text-slate-100 dark:prose-code:text-slate-100 prose-code:text-slate-700 prose-blockquote:text-secondary-color"
          dangerouslySetInnerHTML={{ __html: post.html }}
        ></div>
        {post.relatedPosts?.length ? (
          <div className="space-y-4">
            <Heading level={2}>Related posts</Heading>
            <ul className="text-base list-disc ml-6">
              {post.relatedPosts.map((p, ix: number) => (
                <li key={ix}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="text-main hover:underline"
                  >
                    {p.headline}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </ScreenContainer>
  );
}
