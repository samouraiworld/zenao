"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../shadcn/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../shadcn/form";
import { FormFieldInputString } from "../widgets/form/form-field-input-string";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import { MarkdownPreview } from "../widgets/markdown-preview";
import { ButtonWithChildren } from "../widgets/buttons/button-with-children";
import {
  portfolioUploadVideoSchema,
  PortfolioUploadVideoSchemaType,
} from "@/types/schemas";
import { useMediaQuery } from "@/hooks/use-media-query";

interface PortfolioUploadVideoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoAdded: (data: PortfolioUploadVideoSchemaType) => Promise<void> | void;
}

export default function PortfolioUploadVideoDialog({
  isOpen,
  onOpenChange,
  onVideoAdded,
}: PortfolioUploadVideoDialogProps) {
  const t = useTranslations("community-portfolio");
  const [isLoading, setIsLoading] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<PortfolioUploadVideoSchemaType>({
    mode: "all",
    resolver: zodResolver(portfolioUploadVideoSchema),
    defaultValues: { origin: "youtube", uri: "" },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        origin: "youtube",
        uri: "",
      });
    }
  }, [isOpen, form]);

  const onSubmit = async (data: PortfolioUploadVideoSchemaType) => {
    if (isLoading) return;

    setIsLoading(true);
    await onVideoAdded(data);
    form.reset({ origin: "youtube", uri: "" });
    setIsLoading(false);
    onOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{t("add-video")}</DialogTitle>
            <DialogDescription className="hidden">
              {t("add-video-description")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <PortfolioUploadVideoForm
              form={form}
              isLoading={isLoading}
              onSubmit={onSubmit}
            />
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{t("add-video")}</DrawerTitle>
          <DrawerDescription className="hidden">
            {t("add-video-description")}
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <PortfolioUploadVideoForm
            form={form}
            isLoading={isLoading}
            onSubmit={onSubmit}
          />
        </Form>
      </DrawerContent>
    </Drawer>
  );
}

function PortfolioUploadVideoForm({
  form,
  isLoading = false,
  onSubmit,
}: {
  form: UseFormReturn<PortfolioUploadVideoSchemaType>;
  isLoading?: boolean;
  onSubmit: (data: PortfolioUploadVideoSchemaType) => Promise<void> | void;
}) {
  const t = useTranslations("community-portfolio");

  const origin = form.watch("origin");
  const uri = form.watch("uri");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="origin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("video-origin-label")}</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.trigger("uri");
                  }}
                  value={field.value}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t("video-origin-placeholder")}
                      defaultValue={field.value}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormFieldInputString
          control={form.control}
          name="uri"
          placeholder={
            origin === "youtube"
              ? "https://www.youtube.com/watch?v=..."
              : "https://vimeo.com/..."
          }
        />

        {uri.length > 0 && form.formState.isValid && (
          <MarkdownPreview markdownString={`[${origin} video](${uri})`} />
        )}

        <div className="w-full">
          <ButtonWithChildren
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
            loading={isLoading}
          >
            {t("add-video")}
          </ButtonWithChildren>
        </div>
      </div>
    </form>
  );
}
