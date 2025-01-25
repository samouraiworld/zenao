import remarkGfm from "remark-gfm";
import remarkYoutube from "remark-youtube";
import ReactMarkdown from "react-markdown";
import supersub from "remark-supersub";
import emoji from "remark-emoji";
import { cn } from "@/lib/utils";

export const MarkdownPreview: React.FC<{ markdownString: string }> = ({
  markdownString,
}) => {
  return (
    <ReactMarkdown
      // `prose` className came from @tailwindcss/typography (a plugin that add beautiful typographic defaults to any vanilla HTML you don’t control, like HTML rendered from Markdown)
      className="prose dark:prose-invert"
      remarkPlugins={[
        // superscript and subscript support
        supersub,
        // emoji support
        [emoji, { emoticon: true }],
        // gfm for GitHub Flavored Markdown, support autolink literals, footnotes, strikethrough, tables, tasklists
        [remarkGfm, { singleTilde: false }],
        // support embed player for youtube videos
        remarkYoutube,
      ]}
      // responsive style for embed youtube videos
      components={{
        iframe: (props) => (
          <iframe className={cn(props.className, "w-full")} {...props}></iframe>
        ),
      }}
    >
      {markdownString}
    </ReactMarkdown>
  );
};
