"use client";

import remarkGfm from "remark-gfm";
import remarkYoutube from "remark-youtube";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import supersub from "remark-supersub";
import remarkHtml from "remark-html";
import remarkDirective from "remark-directive";
import { Web3Image } from "../images/web3-image";
import { Web3Audio } from "../audio/web3-audio";
import { cn } from "@/lib/tailwind";
import remarkAudioDirective from "@/lib/remark-audio-directive-plugin";

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
        "[&_*]:my-0 flex flex-col gap-2 prose dark:prose-invert max-w-full",
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
        // to support directives like `::audio`
        remarkDirective,
        remarkAudioDirective,
        remarkYoutube,
        // It’s a shortcut for .use(remarkRehype).use(rehypeSanitize).use(rehypeStringify) needed to compiles markdown to HTML
        remarkHtml,
      ]}
      // responsive style for embed youtube videos
      components={{
        iframe: (props) => (
          <iframe
            className={cn(props.className, `w-full h-full aspect-video`)}
            {...props}
          ></iframe>
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
        audio: (props) => <Web3Audio {...props} src={props.src ?? ""} />,
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
