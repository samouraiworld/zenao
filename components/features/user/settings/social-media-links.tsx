"use client";

import {
  ArrayPath,
  Control,
  FieldArray,
  FieldValues,
  Path,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";
import { socialLinkSchema } from "@/types/schemas";

type SocialLinkItem = { url: string };

interface SocialMediaLinksProps<
  T extends FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>,
> {
  control: Control<T>;
  name: TName;
}

function SocialMediaLinks<
  T extends FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>,
>({ control, name }: SocialMediaLinksProps<T, TName>) {
  const {
    fields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray<T, TName, "id">({
    control,
    name,
  });

  const lastLink = useWatch({
    control,
    name: `${name}.${fields.length - 1}` as Path<T>,
  });

  const socialMediaLinks = useMemo(
    () =>
      fields as (FieldArray<T, TName> & {
        id: string;
      } & SocialLinkItem)[],
    [fields],
  );
  const isLastLinkInvalid = useMemo(
    () =>
      socialMediaLinks?.length > 0 &&
      !socialLinkSchema.shape.url.safeParse(lastLink?.url ?? "").success,
    [socialMediaLinks, lastLink],
  );

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Social links</Heading>

      {socialMediaLinks.map((link, index) => {
        return (
          <div className="flex items-start gap-2" key={link.id}>
            <FormItem className="grow">
              <FormField
                name={`${name}.${index}.url`}
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="text"
                      placeholder="Enter URL"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </div>
                )}
              />
            </FormItem>
            <div
              onClick={() => {
                removeLink(index);
              }}
              className={cn(
                "hover:cursor-pointer hover:bg-destructive flex items-center justify-center rounded-full size-11 aspect-square",
              )}
            >
              <Trash2Icon className="size-4" />
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        className="w-fit"
        onClick={() => appendLink({ url: "" } as FieldArray<T, TName>)}
        disabled={isLastLinkInvalid}
      >
        Add link
      </Button>
    </div>
  );
}

export default SocialMediaLinks;
