import { notFound } from "next/navigation";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DescriptionPage({ params }: Props) {
  const { id } = await params;

  const queryClient = getQueryClient();

  let data;

  try {
    data = await queryClient.fetchQuery(eventOptions(id));
  } catch {
    console.log("DescriptionPage: Event not found for ID:", id);
    notFound();
  }

  return <MarkdownPreview markdownString={data.description} />;
}
