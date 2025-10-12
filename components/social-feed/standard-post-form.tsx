import { AudioWaveform, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { UseFormReturn } from "react-hook-form";
import { FeedInputButtons } from "./feed-input-buttons";
import { ButtonBase } from "@/components/widgets/buttons/button-bases";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
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
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";
import useMarkdownUpload from "@/hooks/use-markdown-upload";
import { useToast } from "@/hooks/use-toast";
import {
  FeedPostFormSchemaType,
  standardPostFormSchema,
} from "@/types/schemas";

export type FeedInputMode = "POLL" | "STANDARD_POST";

export function StandardPostForm({
  feedInputMode,
  setFeedInputMode,
  onSubmit,
  isEditing,
  form,
  isLoading,
}: {
  feedInputMode: FeedInputMode;
  isEditing?: boolean;
  onSubmit: (values: FeedPostFormSchemaType) => Promise<void> | void;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
  form: UseFormReturn<FeedPostFormSchemaType>;
  isLoading?: boolean;
}) {
  const { toast } = useToast();

  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const content = form.watch("content");
  const parentPostId = form.watch("parentPostId");
  const t = useTranslations("social-feed.standard-post-form");

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

  const hiddenAudioInputRef = useRef<HTMLInputElement>(null);
  const hiddenImgInputRef = useRef<HTMLInputElement>(null);

  const { uploadMdFile, uploading, setCursor } = useMarkdownUpload(textareaRef);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected.",
      });
      return;
    }

    try {
      await uploadMdFile(
        file,
        "image",
        (text) => {
          form.setValue("content", text);
        },
        (text) => {
          form.setValue("content", text);
          textareaRef.current?.focus();
        },
      );
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      if (hiddenImgInputRef.current) {
        hiddenImgInputRef.current.value = "";
      }
    }
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected.",
      });
      return;
    }

    try {
      await uploadMdFile(
        file,
        "audio",
        (text) => {
          form.setValue("content", text);
        },
        (text) => {
          form.setValue("content", text);
          textareaRef.current?.focus();
        },
      );
    } catch (error) {
      console.error("Error uploading audio:", error);
    } finally {
      if (hiddenAudioInputRef.current) {
        hiddenAudioInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-4 p-4 rounded", isEditing && "p-0")}
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

              <div className="flex flex-row gap-2 items-center">
                {/* Image upload button */}
                <ButtonBase
                  variant="link"
                  className={cn(
                    "flex items-center justify-center rounded-full aspect-square cursor-pointer w-7 h-7 md:w-12 md:h-12",
                    "hover:bg-neutral-500/20",
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
                    hiddenImgInputRef.current?.click();
                  }}
                  aria-label="upload image"
                >
                  <ImageIcon className="w-5 h-5 md:!h-6 md:!w-6" />
                </ButtonBase>
                <input
                  type="file"
                  onChange={handleImageChange}
                  ref={hiddenImgInputRef}
                  className="hidden"
                  disabled={uploading}
                />
                {/* Audio */}
                <ButtonBase
                  variant="link"
                  className={cn(
                    "flex items-center justify-center rounded-full aspect-square cursor-pointer w-7 h-7 md:w-12 md:h-12",
                    "hover:bg-neutral-500/20",
                  )}
                  title="Upload audio"
                  onClick={(e) => {
                    e.preventDefault();
                    if (uploading) return;

                    setCursor(
                      textareaRef.current?.selectionStart ??
                        textareaRef.current?.textLength ??
                        0,
                    );
                    hiddenAudioInputRef.current?.click();
                  }}
                  aria-label="upload audio"
                >
                  <AudioWaveform className="w-5 h-5 md:!h-6 md:!w-6" />
                </ButtonBase>
                <input
                  type="file"
                  onChange={handleAudioChange}
                  ref={hiddenAudioInputRef}
                  className="hidden"
                  disabled={uploading}
                />
                <FeedInputButtons
                  feedInputMode={feedInputMode}
                  isReplying={!!parentPostId}
                  isEditing={!!isEditing}
                  setFeedInputMode={setFeedInputMode}
                  isLoading={isLoading}
                />
              </div>
            </div>
            <TabsContent value="form">
              <FormField
                rules={{ required: true }}
                control={form.control}
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
