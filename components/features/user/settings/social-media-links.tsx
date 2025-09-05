"use client";

import {
  ControllerRenderProps,
  FieldValues,
  useFieldArray,
  UseFormReturn,
} from "react-hook-form";
import { useCallback } from "react";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";

import { UserFormSchemaType } from "@/types/schemas";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";

function SocialMediaLinks({
  form,
}: {
  form: UseFormReturn<UserFormSchemaType>;
}) {
  const { append: appendLink, remove: removeLink } = useFieldArray({
    control: form.control,
    name: "socialMediaLinks",
  });
  const links = form.watch("socialMediaLinks");

  const onChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      field: ControllerRenderProps<
        FieldValues,
        `socialMediaLinks.${number}.url`
      >,
      index: number,
    ) => {
      const value = e.target.value;
      // Trigger RHF field control
      field.onChange(value);

      let name = "";
      let icon = "";

      try {
        const hostname = new URL(value).hostname;
        const parts = hostname.split(".");
        // Get social link name parsed from value
        name = parts.length > 2 ? parts[1] : parts[0];
        // Get social link icon using google faviconV2 API
        icon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=24`;
      } catch {
        name = "";
        icon = "";
      }

      // Update RHF fields
      form.setValue(`socialMediaLinks.${index}.name`, name, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue(`socialMediaLinks.${index}.icon`, icon, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Social links</Heading>

      {!!links.length &&
        links.map((link, index) => (
          <div className="flex items-center justify-between gap-2" key={index}>
            <div className="flex items-center gap-2">
              {link.icon && (
                <Image
                  src={link.icon}
                  alt={"Icon " + link.name}
                  width={24}
                  height={24}
                  unoptimized
                />
              )}
              <div>{link.name}</div>
            </div>

            <div className="flex gap-2 w-full max-w-[550px]">
              <FormItem className="grow">
                <FormField
                  name={`socialMediaLinks.${index}.url`}
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      <Input
                        type="text"
                        placeholder="Enter URL"
                        value={field.value}
                        onChange={(e) => onChange(e, field, index)}
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
        ))}

      <Button
        type="button"
        className="w-fit"
        onClick={() => appendLink({ name: "", url: "", icon: "" })}
      >
        Add link
      </Button>
    </div>
  );
}

export default SocialMediaLinks;
