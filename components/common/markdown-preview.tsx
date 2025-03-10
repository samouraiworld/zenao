import remarkGfm from "remark-gfm";
import remarkYoutube from "remark-youtube";
import ReactMarkdown from "react-markdown";
import supersub from "remark-supersub";
import remarkHtml from "remark-html";
import { cn } from "@/lib/tailwind";

export function MarkdownPreview({
  markdownString,
}: {
  markdownString: string;
}) {
  return (
    <ReactMarkdown
      // `prose` className came from @tailwindcss/typography (a plugin that add beautiful typographic defaults to any vanilla HTML you don’t control, like HTML rendered from Markdown)
      className="prose dark:prose-invert"
      remarkPlugins={[
        // superscript and subscript support
        supersub,
        // remark-emoji support
        // TODO: correctly handle it with an emoji search, and fix issue with links https://discord.com/channels/369143531920424961/1329806540776935546/1333064816784441345
        // [emoji, { emoticon: true }],

        // gfm for GitHub Flavored Markdown, support autolink literals, footnotes, strikethrough, tables, tasklists
        [remarkGfm, { singleTilde: false }],
        // support embed player for youtube videos
        remarkYoutube,
        // It’s a shortcut for .use(remarkRehype).use(rehypeSanitize).use(rehypeStringify) needed to compiles markdown to HTML
        remarkHtml,
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
}
