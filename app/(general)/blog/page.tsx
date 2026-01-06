import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlogClient } from "seobot";
import Link from "next/link";
import BlogPostCard from "./blog-post-card";
import BlogHeader from "./blog-header";
import Pagination from "./blog-pagination";
import { ScreenContainer } from "@/components/layout/screen-container";

async function getPosts(page: number) {
  const key = process.env.SEOBOT_API_KEY;
  if (!key)
    throw Error(
      "SEOBOT_API_KEY enviroment variable must be set. You can use the DEMO key a8c58738-7b98-4597-b20a-0bb1c2fe5772 for testing - please set it in the root .env.local file",
    );

  const client = new BlogClient(key);
  return client.getArticles(page, 10);
}

export const fetchCache = "force-no-store";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Blog | Zenao";
  const description =
    "Discover the latest articles, news, and updates about Zenao in our blog.";
  return {
    title,
    description,
    metadataBase: new URL("https://zenao.io"),
    alternates: {
      canonical: "/blog",
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: "https://zenao.io/blog",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function Blog({
  searchParams,
}: {
  searchParams: Promise<{ page: number }>;
}) {
  const { page } = await searchParams;
  const pageNumber = Math.max((page || 0) - 1, 0);
  const { total, articles } = await getPosts(pageNumber);
  const posts = articles || [];
  const lastPage = Math.ceil(total / 10);

  const t = await getTranslations("blog");

  if (!posts.length) {
    return (
      <ScreenContainer>
        <div className="flex flex-col gap-12">
          <BlogHeader />
          <p className="text-center text-main">{t("no-blog-posts-title")}</p>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-2 mb-1 w-full dark:text-slate-400 text-sm">
          <Link href="/" className="text-orange-500">
            Home
          </Link>
          <svg
            width="12"
            height="12"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              d="M338.752 104.704a64 64 0 0 0 0 90.496l316.8 316.8l-316.8 316.8a64 64 0 0 0 90.496 90.496l362.048-362.048a64 64 0 0 0 0-90.496L429.248 104.704a64 64 0 0 0-90.496 0z"
            />
          </svg>
          <Link href="/blog/" className="text-orange-500">
            Blog
          </Link>
        </div>
        <BlogHeader />
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>

        {lastPage > 1 && (
          <Pagination
            slug="/blog"
            pageNumber={pageNumber}
            lastPage={lastPage}
          />
        )}
      </div>
    </ScreenContainer>
  );
}
