"use client";

import { FieldValues, useController, useWatch } from "react-hook-form";
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

export const FormFieldImage = <T extends FieldValues>(
  props: FormFieldProps<T, string>,
) => {
  const { toast } = useToast();
  const { field, fieldState } = useController(props);
  const imageUri = useWatch({ control: props.control, name: props.name });

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
      const data = new FormData();
      data.set("file", file);
      const uploadRequest = await fetch("/api/files", {
        method: "POST",
        body: data,
      });
      const resRaw = await uploadRequest.json();
      const res = filesPostResponseSchema.parse(resRaw);
      field.onChange(res.uri);
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
      {isValidURL(imageUri, urlPattern) && !fieldState.error?.message ? (
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
            <FormFieldInputString {...props} />
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
