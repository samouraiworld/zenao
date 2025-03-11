import Link from "next/link";
import Markdown from "react-markdown";
import Image from "next/image";
import remarkGfm from "remark-gfm";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";

interface MarkdownRendererProps {
  md: string;
}

export default function MarkdownRenderer({ md }: MarkdownRendererProps) {
  return (
    <div className="flex w-full flex-col gap-8">
      <Markdown
        components={{
          h1: (props) => <Heading size="4xl" level={1} {...props} />,
          h2: (props) => <Heading size="2xl" level={2} {...props} />,
          h3: (props) => <Heading size="xl" level={3} {...props} />,
          h4: (props) => <Heading size="lg" level={4} {...props} />,
          h5: (props) => <Heading size="default" level={5} {...props} />,
          h6: (props) => <Heading size="sm" level={6} {...props} />,
          p: (props) => <Text {...props} />,
          a: ({ href, ...props }) => <Link href={href ?? "#"} {...props} />,
          img: ({ src, alt, ...props }) => (
            <Image
              {...props}
              src={src ?? "#"}
              alt={alt ?? ""}
              width="500"
              height="500"
              className="w-full h-auto"
              objectFit="cover"
            />
          ),
        }}
        remarkPlugins={[remarkGfm]}
      >
        {md}
      </Markdown>
    </div>
  );
}
