import { readdir, readFile } from "fs/promises";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "posts");
const ARTICLE_PREFIX = "article-";

export type BlogPostMetadata = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type BlogPost = {
  data: Record<string, string>;
  content: string;
};

export async function getPostsMetadata(): Promise<BlogPostMetadata[]> {
  const files = await readdir(postsDirectory);
  const postsMetadataPromises = files
    .filter((fileName) => fileName.startsWith(ARTICLE_PREFIX))
    .map(async (fileName) => {
      const slug = fileName.replace(ARTICLE_PREFIX, "").replace(".md", "");
      const filePath = path.join(postsDirectory, fileName);
      const fileContents = await readFile(filePath, "utf8");
      const { data } = matter(fileContents);
      return {
        slug,
        title: data.title,
        date: data.date,
        description: data.description,
      };
    });

  const postsMetadata = await Promise.all(postsMetadataPromises);

  return postsMetadata.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export async function getPostContent(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(postsDirectory, `${ARTICLE_PREFIX}${slug}.md`);

  try {
    const fileContent = await readFile(filePath);

    const { data, content } = matter(fileContent);

    return { data, content };
  } catch (err) {
    console.log(err);
    return null;
  }
}
