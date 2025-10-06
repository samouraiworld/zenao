"use client";

import { FieldValues, useController, useWatch } from "react-hook-form";
import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
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

const imageVariants = cva("", {
  variants: {
    fit: {
      cover: "object-cover",
      pad: "object-contain",
    },
  },
  defaultVariants: {
    fit: "cover",
  },
});

export const FormFieldImage = <T extends FieldValues>({
  hint = true,
  ...props
}: FormFieldProps<T, string> & {
  aspectRatio: [number, number];
  tooltip?: React.ReactNode;
  hint?: boolean;
  fit?: "cover" | "pad";
}) => {
  const { toast } = useToast();
  const { field, fieldState } = useController(props);
  const imageUri = useWatch({ control: props.control, name: props.name });

  const fit = props.fit || "cover";

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
                <AspectRatio
                  ratio={props.aspectRatio[0] / props.aspectRatio[1]}
                  onClick={handleClick}
                >
                  {/* We have to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead) */}
                  {/* TODO: find a better way */}
                  <Card
                    className={cn(
                      "border-dashed w-full h-full flex flex-col gap-2 justify-center items-center rounded border-2 border-[#EC7E17] overflow-hidden",
                      "hover:bg-secondary cursor-pointer",
                    )}
                  >
                    {isValidURL(imageUri, urlPattern) &&
                    !fieldState.error?.message ? (
                      <>
                        {(!props.fit || props.fit === "pad") && (
                          <Web3Image
                            src={web2URL(imageUri)}
                            alt="imageUri"
                            fill
                            sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                            className={cn(
                              "flex object-cover rounded self-center cursor-pointer blur",
                              "hover:brightness-[60%] transition-all",
                            )}
                          />
                        )}
                        <Web3Image
                          src={web2URL(imageUri)}
                          alt="imageUri"
                          fill
                          sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                          className={cn(
                            "flex object-contain rounded self-center cursor-pointer",
                            "hover:brightness-[60%] transition-all",
                            imageVariants({ fit }),
                          )}
                        />
                      </>
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
            {hint && (
              <Text size="xs" className="text-right">
                Optimal ratio: {getAspectRatioHint(props.aspectRatio)}
                <br />
                <span className="inline-block text-gray-500 whitespace-nowrap">
                  e.g. {100 * props.aspectRatio[0]}x{100 * props.aspectRatio[1]}
                  px
                </span>
              </Text>
            )}
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

function getAspectRatioHint(aspectRatio: [number, number]) {
  const gcd = greatestCommonDivisor(aspectRatio[0], aspectRatio[1]);
  const a = Math.round(aspectRatio[0] / gcd);
  const b = Math.round(aspectRatio[1] / gcd);
  return `${a}/${b}`;
}

function greatestCommonDivisor(a: number, b: number) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  for (; b !== 0; ) {
    const c = a;
    a = b;
    b = c % b;
  }
  return a;
}
