"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";
import { UserFormSchemaType } from "@/types/schemas";

function SkillsList({ form }: { form: UseFormReturn<UserFormSchemaType> }) {
  const {
    append,
    remove,
    fields: skillFields,
  } = useFieldArray({
    control: form.control,
    name: "skills", // TODO: Type '"skills"' is not assignable to type '"socialMediaLinks"'
  });

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Skills</Heading>

      {skillFields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2">
          <FormItem className="grow">
            <FormField
              name={`skills.${index}`}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. React"
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </div>
              )}
            />
          </FormItem>

          <div
            onClick={() => remove(index)}
            className={cn(
              "hover:cursor-pointer hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center rounded-full size-11 aspect-square transition-colors",
            )}
          >
            <Trash2Icon className="size-4" />
          </div>
        </div>
      ))}

      <Button type="button" className="w-fit" onClick={() => append("")}>
        {/* TODO: avoid empty skill */}
        Add skill
      </Button>
    </div>
  );
}

export default SkillsList;
