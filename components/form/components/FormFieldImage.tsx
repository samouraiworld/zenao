"use client";

import { FieldValues, useController, useWatch } from "react-hook-form";
import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { FormFieldProps, urlPattern } from "../types";
import { useToast } from "@/app/hooks/use-toast";
import { filesPostResponseSchema } from "@/lib/files";
import { Skeleton } from "@/components/shadcn/skeleton";
import { isValidURL, web2URL } from "@/lib/uris";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";

export const FormFieldImage = <T extends FieldValues>(
  props: FormFieldProps<T, string> & {
    aspectRatio?: number;
  },
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
    <FormField
      control={props.control}
      name={props.name}
      render={() => (
        <FormItem className="space-y-0 flex flex-col w-full sm:w-2/5">
          <AspectRatio ratio={props.aspectRatio}>
            {/* We have to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead) */}
            {/* TODO: find a better way */}
            {isValidURL(imageUri, urlPattern) && !fieldState.error?.message ? (
              <Image
                src={web2URL(imageUri)}
                alt="imageUri"
                fill
                sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 50vw,
                      33vw"
                className={`flex object-cover rounded-xl self-center border`}
              />
            ) : (
              <Skeleton className="w-full h-[330px] rounded-xnter flex justify-center items-center border">
                {uploading && <Loader2 className="animate-spin" />}
              </Skeleton>
            )}
          </AspectRatio>
          <div className="self-end relative bottom-8 right-2">
            <ImageIcon onClick={handleClick} className="w-5 cursor-pointer" />
            <input
              type="file"
              onChange={handleChange}
              ref={hiddenInputRef}
              className="hidden"
              disabled={uploading}
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
