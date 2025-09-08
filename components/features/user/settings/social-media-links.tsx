"use client";

import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";

import { UserFormSchemaType } from "@/types/schemas";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";
import { getFaviconUrl } from "@/lib/favicon";

function SocialMediaLinks({
  form,
}: {
  form: UseFormReturn<UserFormSchemaType>;
}) {
  const {
    append: appendLink,
    remove: removeLink,
    fields: linkFields,
  } = useFieldArray({
    control: form.control,
    name: "socialMediaLinks",
  });

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Social links</Heading>

      {linkFields.map((link, index) => {
        const url = form.watch(`socialMediaLinks.${index}.url`);
        const icon = getFaviconUrl(url);

        return (
          <div
            className="flex items-center justify-between gap-6"
            key={link.id}
          >
            {icon && (
              <Image
                src={icon}
                alt={"Icon " + link.url}
                width={24}
                height={24}
                unoptimized
              />
            )}

            <div className="flex flex-1 gap-2 ">
              <FormItem className="grow">
                <FormField
                  name={`socialMediaLinks.${index}.url`}
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
          </div>
        );
      })}

      <Button
        type="button"
        className="w-fit"
        onClick={() => appendLink({ url: "", icon: "" })}
      >
        Add link
      </Button>
    </div>
  );
}

export default SocialMediaLinks;
