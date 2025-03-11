import { readdir, readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "posts");
const ARTICLE_PREFIX = "article-";

const headerSchema = z.object({
  title: z.string(),
  description: z.string(),
  previewImageUrl: z.string().optional(),
  date: z.string().refine((value) => !isNaN(Date.parse(value))),
});

type BlogPostHeader = z.infer<typeof headerSchema>;

export interface BlogPostMetadata extends BlogPostHeader {
  slug: string;
}

export type BlogPost = {
  data: BlogPostHeader;
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

      const validatedData = headerSchema.parse(data);

      return {
        slug,
        title: validatedData.title,
        date: validatedData.date,
        description: validatedData.description,
        previewImageUrl: validatedData.previewImageUrl,
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

    const validatedData = headerSchema.parse(data);

    return {
      data: {
        title: validatedData.title,
        date: validatedData.date,
        description: validatedData.description,
        previewImageUrl: validatedData.previewImageUrl,
      },
      content,
    };
  } catch (_) {
    return null;
  }
}
