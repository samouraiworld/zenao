"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { AudioWaveformIcon, ImageIcon } from "lucide-react";
import { EventFormSchemaType } from "@/types/schemas";
import { Card } from "@/components/widgets/cards/card";
import { Tabs, TabsContent } from "@/components/shadcn/tabs";
import TabsIconsList from "@/components/widgets/tabs/tabs-icons-list";
import { getMarkdownEditorTabs } from "@/lib/markdown-editor";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { cn } from "@/lib/tailwind";
import { Button } from "@/components/shadcn/button";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import useMarkdownUpload from "@/hooks/use-markdown-upload";
import { useToast } from "@/hooks/use-toast";
import {
  AUDIO_FILE_SIZE_LIMIT,
  AUDIO_FILE_SIZE_LIMIT_MB,
  IMAGE_FILE_SIZE_LIMIT,
  IMAGE_FILE_SIZE_LIMIT_MB,
} from "@/components/features/event/constants";
import { captureException } from "@/lib/report";
import { Separator } from "@/components/shadcn/separator";
import Text from "@/components/widgets/texts/text";

export default function DashboardFormDescription() {
  const { toast } = useToast();
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("eventForm");
  const description = form.watch("description");

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const hiddenAudioInputRef = useRef<HTMLInputElement>(null);
  const hiddenImgInputRef = useRef<HTMLInputElement>(null);

  const { uploadMdFile, uploading, setCursor } =
    useMarkdownUpload(descriptionRef);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target?.files?.[0];
      if (!file) {
        toast({
          variant: "destructive",
          title: t("no-file-selected-error"),
        });
        return;
      }

      await uploadMdFile(
        file,
        "image",
        (text) => {
          form.setValue("description", text);
        },
        (text) => {
          form.setValue("description", text);
          descriptionRef.current?.focus();
        },
        IMAGE_FILE_SIZE_LIMIT,
      );
    } catch (error) {
      captureException(error);
      console.error("Error uploading image:", error);
      if (
        error instanceof Error &&
        error.message.includes("File size exceeds limit")
      ) {
        toast({
          variant: "destructive",
          title: t("error-filesize-exceeds-limit", {
            size: IMAGE_FILE_SIZE_LIMIT_MB,
          }),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("error-file-uploading-img"),
        });
      }
    } finally {
      if (hiddenImgInputRef.current) {
        hiddenImgInputRef.current.value = "";
      }
    }
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target?.files?.[0];
      if (!file) {
        toast({
          variant: "destructive",
          title: t("no-file-selected-error"),
        });
        return;
      }

      await uploadMdFile(
        file,
        "audio",
        (text) => {
          form.setValue("description", text);
        },
        (text) => {
          form.setValue("description", text);
          descriptionRef.current?.focus();
        },
        AUDIO_FILE_SIZE_LIMIT,
      );
    } catch (error) {
      captureException(error);
      console.error("Error uploading audio:", error);
      if (
        error instanceof Error &&
        error.message.includes("File size exceeds limit")
      ) {
        toast({
          variant: "destructive",
          title: t("error-filesize-exceeds-limit", {
            size: AUDIO_FILE_SIZE_LIMIT_MB,
          }),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("error-file-uploading-audio"),
        });
      }
    } finally {
      if (hiddenAudioInputRef.current) {
        hiddenAudioInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="rounded px-3 border-custom-input-border">
      <div className="flex flex-col gap-4 relative">
        <Tabs defaultValue="write" className="w-full">
          <div className="flex flex-row items-center justify-between">
            <Text className="font-semibold">{t("description-label")}</Text>

            <TabsIconsList
              tabs={getMarkdownEditorTabs({
                writeLabel: t("write-tab"),
                previewLabel: t("preview-tab"),
              })}
              className="rounded p-0 h-fit"
            />
          </div>

          <Separator className="mt-2 mb-3" />

          <TabsContent value="write" tabIndex={-1}>
            <div className="flex flex-col gap-2 w-full">
              <FormFieldTextArea
                ref={descriptionRef}
                control={form.control}
                name="description"
                placeholder={t("description-placeholder")}
                className={cn(
                  "bg-transparent",
                  "mt-6 focus-visible:ring-transparent w-full placeholder:text-secondary-color",
                )}
                maxLength={10000}
                wordCounter
              />
              {/* Upload image buttons */}
              <div className="flex flex-row gap-2 self-end">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-fit flex items-center justify-center cursor-pointer",
                    "hover:bg-neutral-700",
                  )}
                  title="Add image"
                  onClick={(e) => {
                    e.preventDefault();
                    if (uploading) return;

                    setCursor(
                      descriptionRef.current?.selectionStart ??
                        descriptionRef.current?.textLength ??
                        0,
                    );
                    hiddenImgInputRef.current?.click();
                  }}
                  aria-label="Add image"
                >
                  <ImageIcon className="!h-4 !w-4" />
                </Button>
                <input
                  type="file"
                  onChange={handleImageChange}
                  ref={hiddenImgInputRef}
                  className="hidden"
                  disabled={uploading}
                />

                <Button
                  variant="ghost"
                  className={cn(
                    "w-fit flex px-4 items-center justify-center cursor-pointer",
                    "hover:bg-neutral-700",
                  )}
                  title="Add audio"
                  onClick={(e) => {
                    e.preventDefault();
                    if (uploading) return;

                    setCursor(
                      descriptionRef.current?.selectionStart ??
                        descriptionRef.current?.textLength ??
                        0,
                    );
                    hiddenAudioInputRef.current?.click();
                  }}
                  aria-label="Add audio"
                >
                  <AudioWaveformIcon className="!h-4 !w-4" />
                </Button>
                <input
                  type="file"
                  onChange={handleAudioChange}
                  ref={hiddenAudioInputRef}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="preview">
            {description.trim() === "" ? (
              <div className="w-full h-32 flex items-center justify-center text-sm text-muted-foreground">
                {t("preview-empty")}
              </div>
            ) : null}
            <MarkdownPreview markdownString={description} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
