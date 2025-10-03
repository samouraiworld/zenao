import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventSectionsPage({ params }: PageProps) {
  const { id } = await params;

  const queryClient = getQueryClient();

  const data = await queryClient.fetchQuery(eventOptions(id));

  return <MarkdownPreview markdownString={data.description} />;
}
