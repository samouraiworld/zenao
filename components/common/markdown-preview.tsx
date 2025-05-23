"use client";

import remarkGfm from "remark-gfm";
import remarkYoutube from "remark-youtube";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import supersub from "remark-supersub";
import remarkHtml from "remark-html";
import { Web3Image } from "../images/web3-image";
import { cn } from "@/lib/tailwind";

export function MarkdownPreview({
  markdownString,
  className,
}: {
  markdownString: string;
  className?: string;
}) {
  return (
    <ReactMarkdown
      // `prose` className came from @tailwindcss/typography (a plugin that add beautiful typographic defaults to any vanilla HTML you don’t control, like HTML rendered from Markdown)
      className={cn(
        "[&_*]:my-0 max-w-full flex flex-col gap-2 prose dark:prose-invert max-w-full",
        className,
      )}
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
        img: (props) => {
          return (
            <Web3Image
              {...props}
              src={props.src ?? ""}
              alt={props.alt ?? ""}
              width={960}
              height={960}
            />
          );
        },
        a: (props) => <a {...props} target="_blank" />,
      }}
      urlTransform={(options) => {
        const isWeb3 = options.startsWith("ipfs://");

        return isWeb3 ? options : defaultUrlTransform(options);
      }}
    >
      {markdownString}
    </ReactMarkdown>
  );
}
