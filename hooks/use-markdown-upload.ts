import { useState } from "react";
import { uploadFile } from "@/lib/files";

function useMarkdownUpload(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
) {
  // Textarea last cursor before upload
  const [cursor, setCursor] = useState(0);
  const [uploading, setUploading] = useState(false);

  const uploadMdFile = async (
    file: File,
    fileType: "image" | "audio",
    onUploading?: (text: string) => void,
    onSuccess?: (test: string) => void,
  ) => {
    setUploading(true);
    const textarea = textareaRef.current;
    const loadingText = `${cursor > 0 ? "\n" : ""}[Uploading ${file.name}...]\n`;

    if (textarea) {
      const before = textarea.value.substring(0, cursor);
      const after = textarea.value.substring(cursor);

      // Insert the text at cursor position
      onUploading?.(before + loadingText + after);

      // Move cursor after the inserted text
      const newCursorPos = cursor + loadingText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }

    const uri = await uploadFile(file);

    if (textarea) {
      onSuccess?.(uri);

      const text =
        fileType === "image"
          ? `${cursor > 0 ? "\n" : ""}![${file.name}](${uri})\n`
          : `${cursor > 0 ? "\n" : ""}::audio[${file.name}]{url="${uri}"}\n`;

      const start = textarea.value.indexOf(loadingText);

      if (start < 0) {
        // If loading text not found, insert at cursor
        const before = textarea.value.substring(0, cursor);
        const after = textarea.value.substring(cursor);

        // Insert the text at cursor position
        onSuccess?.(before + text + after);
      } else {
        const before = textarea.value.substring(0, cursor);
        const after = textarea.value.substring(start + loadingText.length);

        onSuccess?.(before + text + after);

        const newCursor = start + loadingText.length;
        textarea.setSelectionRange(newCursor, newCursor);

        textarea.focus();
      }
    }
    setUploading(false);
  };

  return {
    uploading,
    cursor,
    uploadMdFile,
    setCursor,
  };
}

export default useMarkdownUpload;
