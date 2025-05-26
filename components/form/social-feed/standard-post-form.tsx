import { useAuth } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { useMediaQuery } from "react-responsive";
import { FeedInputButtons } from "./feed-input-buttons";
import { useToast } from "@/app/hooks/use-toast";
import { ButtonBase } from "@/components/buttons/ButtonBases";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import {
  standardPostFormSchema,
  StandardPostFormSchemaType,
} from "@/components/form/types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { Textarea } from "@/components/shadcn/textarea";
import Text from "@/components/texts/text";
import { uploadFile } from "@/lib/files";
import { getQueryClient } from "@/lib/get-query-client";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { cn } from "@/lib/tailwind";

export type FeedInputMode = "POLL" | "STANDARD_POST";

export function StandardPostForm({
  eventId,
  feedInputMode,
  setFeedInputMode,
}: {
  eventId: string;
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
}) {
  const queryClient = getQueryClient();
  const { createStandardPost, isPending } = useCreateStandardPost(queryClient);
  const t = useTranslations("event-feed.standard-post-form");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });

  const standardPostForm = useForm<StandardPostFormSchemaType>({
    resolver: zodResolver(standardPostFormSchema),
    defaultValues: {
      content: "",
    },
  });
  const content = standardPostForm.watch("content");

  const textareaMaxLength =
    standardPostFormSchema.shape.content._def.checks.find(
      (check) => check.kind === "max",
    )?.value;

  // Auto shrink and grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaMaxHeight = 300;
  const textareaMinHeight = 48;
  const placeholder = isSmallScreen
    ? t("message-placeholder-sm")
    : t("message-placeholder-lg");

  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    try {
      if (!file) {
        toast({
          variant: "destructive",
          title: "No file selected.",
        });
        return;
      }
      setUploading(true);
      const textarea = textareaRef.current;
      const loadingText = `${cursor > 0 ? "\n" : ""}[Uploading ${file.name}...]\n`;

      if (textarea) {
        const before = textarea.value.substring(0, cursor);
        const after = textarea.value.substring(cursor);

        // Insert the text at cursor position
        standardPostForm.setValue("content", before + loadingText + after);

        // Move cursor after the inserted text
        const newCursorPos = cursor + loadingText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }

      const uri = await uploadFile(file);

      if (textarea) {
        const text = `${cursor > 0 ? "\n" : ""}![${file.name}](${uri})\n`;
        const start = textarea.value.indexOf(loadingText);

        if (start < 0) {
          // If loading text not found, insert at cursor
          const before = textarea.value.substring(0, cursor);
          const after = textarea.value.substring(cursor);

          // Insert the text at cursor position
          standardPostForm.setValue("content", before + text + after);
        } else {
          const before = textarea.value.substring(0, cursor);
          const after = textarea.value.substring(start + loadingText.length);

          standardPostForm.setValue("content", before + text + after);

          const newCursor = start + loadingText.length;
          textarea.setSelectionRange(newCursor, newCursor);

          textarea.focus();
        }
      }
      setUploading(false);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Trouble uploading file!",
      });
    }
    setUploading(false);
  };

  // Textarea last cursor before upload
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  const onSubmitStandardPost = async (values: StandardPostFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await createStandardPost({
        eventId,
        content: values.content,
        parentId: "",
        token,
        userAddress: userAddress ?? "",
        tags: [],
      });

      standardPostForm.reset({}, { keepValues: false });
      toast({
        title: t("toast-post-creation-success"),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
      console.error("error", err);
    }
  };

  return (
    <Form {...standardPostForm}>
      <form
        onSubmit={standardPostForm.handleSubmit(onSubmitStandardPost)}
        className="flex flex-col gap-4 bg-accent p-4 rounded"
      >
        <div className="flex flex-row gap-4">
          <Tabs defaultValue="form" className="w-full">
            <div className="w-full flex justify-between">
              <TabsList className="p-0 h-fit">
                <TabsTrigger value="form">
                  <Text size="sm">Write</Text>
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Text size="sm">Preview</Text>
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-row gap-2">
                <ButtonBase
                  variant="link"
                  className={cn(
                    "flex items-center justify-center rounded-full aspect-square cursor-pointer",
                    "hover:bg-neutral-700",
                  )}
                  title="Upload image"
                  onClick={(e) => {
                    e.preventDefault();
                    if (uploading) return;

                    setCursor(
                      textareaRef.current?.selectionStart ??
                        textareaRef.current?.textLength ??
                        0,
                    );
                    hiddenInputRef.current?.click();
                  }}
                  aria-label="upload image"
                  style={{
                    height: textareaMinHeight,
                    width: textareaMinHeight,
                  }}
                >
                  <Paperclip className="!h-6 !w-6" />
                </ButtonBase>
                <FeedInputButtons
                  buttonSize={textareaMinHeight}
                  feedInputMode={feedInputMode}
                  setFeedInputMode={setFeedInputMode}
                  isLoading={isPending}
                />
                <input
                  type="file"
                  onChange={handleChange}
                  ref={hiddenInputRef}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </div>
            <TabsContent value="form">
              <FormField
                rules={{ required: true }}
                control={standardPostForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="relative w-full">
                    <FormControl>
                      <Textarea
                        ref={textareaRef}
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
                        style={{
                          minHeight: textareaMinHeight,
                          maxHeight: textareaMaxHeight,
                        }}
                        placeholder={placeholder}
                        maxLength={textareaMaxLength}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="preview" className={`!min-h-[70px]`}>
              {content.trim().length === 0 ? (
                <Text>Nothing to preview</Text>
              ) : (
                <MarkdownPreview markdownString={content} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
}
