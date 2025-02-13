"use client";

import {
  FieldPathByValue,
  FieldValues,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { useRef, useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import Image from "next/image";
import { FormFieldProps, urlPattern } from "../types";
import { FormFieldInputString } from "./FormFieldInputString";
import { useToast } from "@/app/hooks/use-toast";
import { filesPostResponseSchema } from "@/lib/files";
import { Card } from "@/components/cards/Card";
import { Skeleton } from "@/components/shadcn/skeleton";
import { isValidURL, web2URL } from "@/lib/uris";

export const FormFieldURI = <T extends FieldValues>({
  name,
  className,
  placeholder,
  form,
}: Omit<FormFieldProps<T, string>, "control"> & { form: UseFormReturn<T> }) => {
  const { toast } = useToast();
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const imageUri = form.watch(name);

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
      const data = new FormData();
      data.set("file", file);
      const uploadRequest = await fetch("/api/files", {
        method: "POST",
        body: data,
      });
      const resRaw = await uploadRequest.json();
      const res = filesPostResponseSchema.parse(resRaw);
      form.setValue(name, res.uri as PathValue<T, FieldPathByValue<T, string>>);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Trouble uploading file!",
      });
    }
    setUploading(false);
  };

  const handleClick = () => {
    hiddenInputRef.current?.click();
  };
  return (
    <div className="flex flex-col gap-4 w-full sm:w-2/5">
      {/* We have to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead) */}
      {/* TODO: find a better way */}
      {isValidURL(imageUri, urlPattern) &&
      !form.formState.errors.imageUri?.message ? (
        <Image
          src={web2URL(imageUri)}
          width={330}
          height={330}
          alt="imageUri"
          className="flex w-full rounded-xl self-center"
        />
      ) : (
        <Skeleton className="w-full h-[330px] rounded-xnter flex justify-center items-center">
          {uploading && <Loader2 className="animate-spin" />}
        </Skeleton>
      )}
      <Card>
        <div className="flex flex-row gap-3">
          <div className="w-full">
            <FormFieldInputString<T>
              control={form.control}
              name={name}
              placeholder={placeholder}
              className={className}
            />
          </div>
          <div>
            <CloudUpload onClick={handleClick} className="w-5 cursor-pointer" />
            <input
              type="file"
              onChange={handleChange}
              ref={hiddenInputRef}
              className="hidden"
              disabled={uploading}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
