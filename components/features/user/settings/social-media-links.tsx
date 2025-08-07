"use client";

import { useFieldArray, UseFormReturn } from "react-hook-form";
import { useCallback } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { UserFormSchemaType } from "@/types/schemas";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";

const SOCIAL_LINKS_KEYS = [
  "twitter",
  "github",
  "website",
  "discord",
  "telegram",
  "linkedin",
] as const;

function getUndefinedSocialLinkKeys(
  socialLinks: UserFormSchemaType["socialMediaLinks"],
): (typeof SOCIAL_LINKS_KEYS)[number][] {
  const filters = SOCIAL_LINKS_KEYS.filter(
    (key) => socialLinks.findIndex(({ name }) => name === key) === -1,
  );
  return filters;
}

function SocialMediaLinks({
  form,
}: {
  form: UseFormReturn<UserFormSchemaType>;
}) {
  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control: form.control,
    name: "socialMediaLinks",
  });
  const links = form.watch("socialMediaLinks");

  const selectItemValues = useCallback(
    (currentValue?: string) => {
      const items = [
        ...new Set([...getUndefinedSocialLinkKeys(links), currentValue]),
      ];

      return items.map(
        (item) =>
          item && (
            <SelectItem key={item} data-cy-value={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </SelectItem>
          ),
      );
    },
    [links],
  );

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Social links</Heading>

      {linkFields.map((link, index) => (
        <div className="flex gap-2 items-start" key={link.id}>
          <FormItem>
            <FormField
              name={`socialMediaLinks.${index}.name`}
              render={({ field }) => {
                return (
                  <div>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <SelectTrigger
                        aria-label="Select link type"
                        className="w-[128px] h-12"
                      >
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectItemValues(field.value)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </div>
                );
              }}
            />
          </FormItem>
          <FormItem className="grow">
            <FormField
              name={`socialMediaLinks.${index}.url`}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    placeholder="Enter URL"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
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
      ))}
      <Button
        type="button"
        className="w-fit"
        onClick={() =>
          appendLink({ name: getUndefinedSocialLinkKeys(links)[0], url: "" })
        }
        disabled={linkFields.length >= SOCIAL_LINKS_KEYS.length}
      >
        Add link
      </Button>
    </div>
  );
}

export default SocialMediaLinks;
