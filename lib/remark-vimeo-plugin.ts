import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Paragraph, Link, Text } from "mdast";

interface RemarkVimeoEmbedOptions {
  responsive?: boolean;
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  className?: string;
  allow?: string;
}

function defaultOptions(): Required<RemarkVimeoEmbedOptions> {
  return {
    responsive: true,
    width: 640,
    height: 360,
    aspectRatio: 16 / 9,
    className: "remark-vimeo-embed",
    allow: "autoplay; fullscreen;",
  };
}

function extractVimeoId(url: string): string | null {
  try {
    url = url.trim();

    // If the value is just digits, assume it's the ID
    const justDigits = url.match(/^\d+$/);
    if (justDigits) return justDigits[0];

    // Capture Vimeo ID from common URL forms:
    // - https://vimeo.com/12345678
    // - https://vimeo.com/channels/staffpicks/12345678
    // - https://vimeo.com/album/3953262/video/12345678
    // - https://player.vimeo.com/video/12345678
    const vimeoRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com(?:\/(?:.*?\/)?)?(?:video\/)?(\d+)(?:[^\d]|$)/i;
    const m = url.match(vimeoRegex);
    if (m && m[1]) return m[1];

    // Fallback: any reasonably long digit sequence
    const fallback = url.match(/(\d{6,})/);
    return fallback ? fallback[1] : null;
  } catch {
    return null;
  }
}
export const remarkVimeoEmbed: Plugin<[RemarkVimeoEmbedOptions?], Root> = (
  userOptions,
) => {
  const opts = { ...defaultOptions(), ...userOptions };

  return (tree) => {
    visit(tree, function (node, index, parent) {
      if (!parent || typeof index !== "number") return;
      if (node.type !== "paragraph") return;
      if (!("children" in node) || !Array.isArray(node.children)) return;

      const paragraph = node as Paragraph;
      if (paragraph.children.length !== 1) return;

      const child = paragraph.children[0];
      let url: string | null = null;

      if (child.type === "link") {
        const link = child as Link;
        if (link.url) {
          url = link.url;
        }
      } else if (child.type === "text") {
        const text = child as Text;
        if (!/\s/.test(text.value)) {
          url = text.value.trim();
        }
      }
      if (!url) return;

      const id = extractVimeoId(url);
      if (!id) return;

      const src = `https://player.vimeo.com/video/${id}`;

      // Prepare iframe properties
      const iframeProps: Record<string, unknown> = {
        src,
        title: `Vimeo video ${id}`,
        allow: opts.allow,
        allowFullScreen: true,
        frameBorder: 0,
      };

      let replacement: Paragraph | undefined;

      if (opts.responsive) {
        const paddingTop = (1 / opts.aspectRatio) * 100 + "%";
        replacement = {
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: {
              className: opts.className,
              style: `position:relative;padding-top:${paddingTop};height:0;overflow:hidden;`,
            },
            hChildren: [
              {
                type: "element",
                tagName: "iframe",
                properties: {
                  ...iframeProps,
                  style:
                    "position:absolute;top:0;left:0;width:100%;height:100%;border:0;",
                },
                children: [],
              },
            ],
          },
          children: [],
        };
        parent.children.splice(index, 1, replacement);
      } else {
        replacement = {
          type: "paragraph",
          data: {
            hName: "iframe",
            hProperties: {
              ...iframeProps,
              width: opts.width,
              height: opts.height,
            },
          },
          children: [],
        };
        parent.children.splice(index, 1, replacement);
      }
    });
  };
};

export default remarkVimeoEmbed;
