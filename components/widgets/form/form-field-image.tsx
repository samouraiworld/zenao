"use client";

import { FieldValues, useController, useWatch } from "react-hook-form";
import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/files";
import { isValidURL, web2URL } from "@/lib/uris";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import Text from "@/components/widgets/texts/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { Card } from "@/components/widgets/cards/card";
import { cn } from "@/lib/tailwind";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { FormFieldProps, urlPattern } from "@/types/schemas";

export const FormFieldImage = <T extends FieldValues>(
  props: FormFieldProps<T, string> & {
    aspectRatio?: number;
    tooltip?: React.ReactNode;
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
      const uri = await uploadFile(file);
      field.onChange(uri);
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
        <FormItem className={cn("flex flex-col w-full", props.className)}>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <AspectRatio ratio={props.aspectRatio} onClick={handleClick}>
                  {/* We have to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead) */}
                  {/* TODO: find a better way */}
                  <Card
                    className={cn(
                      "border-dashed w-full h-full flex flex-col gap-2 justify-center items-center rounded border-2 border-[#EC7E17]",
                      "hover:bg-secondary cursor-pointer",
                    )}
                  >
                    {isValidURL(imageUri, urlPattern) &&
                    !fieldState.error?.message ? (
                      <Web3Image
                        src={web2URL(imageUri)}
                        alt="imageUri"
                        fill
                        sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                        className={cn(
                          "flex object-cover rounded self-center cursor-pointer",
                          "hover:brightness-[60%] transition-all",
                        )}
                      />
                    ) : (
                      <>
                        <ImageIcon
                          onClick={handleClick}
                          strokeWidth={1}
                          className="w-16 h-16 text-secondary-color"
                        />
                        <Text variant="secondary">Upload an image</Text>
                        {uploading && <Loader2 className="animate-spin" />}
                      </>
                    )}
                  </Card>
                </AspectRatio>
              </TooltipTrigger>
              {props.tooltip && (
                <TooltipContent className="bg-secondary" side="bottom">
                  {props.tooltip}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <div className="bottom-8 right-2">
            <input
              type="file"
              name={props.name}
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
