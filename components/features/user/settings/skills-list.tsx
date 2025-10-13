"use client";

import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";

import { UserFormSchemaType, userFormSkillSchema } from "@/types/schemas";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";

function SkillsList({ form }: { form: UseFormReturn<UserFormSchemaType> }) {
  const {
    append: appendSkill,
    remove: removeSkill,
    fields: skillFields,
  } = useFieldArray({
    control: form.control,
    name: "skills",
  });

  const skills = useWatch({
    control: form.control,
    name: "skills",
  });

  const lastSkill = skills?.at(-1)?.name ?? "";

  const isLastSkillInvalid =
    skills?.length > 0 &&
    !userFormSkillSchema.shape.name.safeParse(lastSkill).success;

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Skills</Heading>

      {skillFields.map((skill, index) => {
        return (
          <div className="flex items-start gap-2" key={skill.id}>
            <FormItem className="grow">
              <FormField
                name={`skills.${index}.name`}
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
              onClick={() => {
                removeSkill(index);
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
        onClick={() => appendSkill({ name: "" })}
        disabled={isLastSkillInvalid}
      >
        Add skill
      </Button>
    </div>
  );
}

export default SkillsList;
