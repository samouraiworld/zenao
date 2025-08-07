"use client";

import { useFieldArray, UseFormReturn } from "react-hook-form";
import { useCallback } from "react";
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
import { FormField, FormItem } from "@/components/shadcn/form";

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
            <SelectItem key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </SelectItem>
          ),
      );
    },
    [links],
  );

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        onClick={() =>
          appendLink({ name: getUndefinedSocialLinkKeys(links)[0] })
        }
      >
        Add link
      </Button>
      {linkFields.map((_, index) => (
        <div className="flex gap-2" key={index}>
          <FormItem>
            <FormField
              name={`socialMediaLinks.${index}.name`}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-[180px] h-12">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>{selectItemValues(field.value)}</SelectContent>
                </Select>
              )}
            />
          </FormItem>
          <Input type="text" placeholder="Enter URL" />
        </div>
      ))}
    </div>
  );
}

export default SocialMediaLinks;
