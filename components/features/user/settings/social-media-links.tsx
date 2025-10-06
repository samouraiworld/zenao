"use client";

import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";

import { UserFormSchemaType, userFormSocialLinkSchema } from "@/types/schemas";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";

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

  const socialMediaLinks = useWatch({
    control: form.control,
    name: "socialMediaLinks",
  });

  const lastUrl = socialMediaLinks?.at(-1)?.url ?? "";

  const isLastLinkInvalid =
    socialMediaLinks?.length > 0 &&
    !userFormSocialLinkSchema.shape.url.safeParse(lastUrl).success;

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Social links</Heading>

      {linkFields.map((link, index) => {
        return (
          <div className="flex items-start gap-2" key={link.id}>
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
        );
      })}

      <Button
        type="button"
        className="w-fit"
        onClick={() => appendLink({ url: "" })}
        disabled={isLastLinkInvalid}
      >
        Add link
      </Button>
    </div>
  );
}

export default SocialMediaLinks;
