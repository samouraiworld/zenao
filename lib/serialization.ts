import matter from "gray-matter";
import { ZodSchema } from "zod";

// Generic front-matter serialization/deserialization functions

export function serializeWithFrontMatter<T extends object>(
  main: string,
  data: T,
): string {
  return matter.stringify(main, data);
}

export function deserializeWithFrontMatter<
  T extends object,
  U extends ZodSchema,
>({
  serialized,
  schema,
  defaultValue,
  contentFieldName = "content",
}: {
  serialized: string;
  schema: U;
  defaultValue?: T;
  contentFieldName?: string;
}): T {
  const { content, data } = matter(serialized);
  const result = schema.safeParse({ [contentFieldName]: content, ...data });

  if (!result.success) {
    return defaultValue || ({} as T);
  }

  return result.data;
}
