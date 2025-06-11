import { visit } from "unist-util-visit";
import { Root } from "mdast";

function remarkAudioDirective() {
  /**
   * @param {Root} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree: Root) {
    visit(tree, function (node) {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        if (node.name !== "audio") return;

        const data = node.data || (node.data = {});
        const attributes = node.attributes || {};
        const url = attributes.url;

        data.hName = "audio";
        data.hProperties = {
          src: (url?.length ?? 0 > 0) ? url : "#",
          controls: true,
          controlsList: "nodownload",
        };
      }
    });
  };
}

export default remarkAudioDirective;
