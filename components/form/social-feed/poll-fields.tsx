"use client";

import { Control, useFieldArray, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { FormFieldInputString } from "../components/FormFieldInputString";
import { pollFormSchema, PollFormSchemaType } from "../types";
import { FormFieldInputNumber } from "../components/FormFieldInputNumber";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { cn } from "@/lib/tailwind";
import { FormFieldCheckbox } from "@/components/form/components/form-field-checkbox";
import Text from "@/components/texts/text";

export function PollFields({
  form,
}: {
  form: UseFormReturn<PollFormSchemaType>;
}) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const onClickAddOption = () => {
    appendOption({ text: "" });
  };

  return (
    <div className="flex w-full sm:flex-row items-center sm:h-full">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-4">
          {optionFields.map((field, index) => (
            <PollOptionItem
              key={field.id}
              name={`options.${index}.text`}
              control={form.control}
              onClickRemove={() => removeOption(index)}
              canRemove={optionFields.length > 2}
            />
          ))}

          <div className="flex justify-between items-center w-full">
            {optionFields.length < 9 && (
              <AddOptionButton onClick={onClickAddOption} />
            )}

            <FormFieldCheckbox
              name="allowMultipleOptions"
              control={form.control}
              label="Allow multiple answers"
            />
          </div>
        </div>

        <PollFormDuration form={form} />
      </div>
    </div>
  );
}

function PollOptionItem({
  name,
  control,
  onClickRemove,
  canRemove,
}: {
  name: `options.${number}.text`;
  control: Control<PollFormSchemaType>;
  onClickRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex flex-row items-center gap-2 w-full">
      <FormFieldInputString
        control={control}
        name={name}
        placeholder="Enter an answer"
        className="w-full"
      />
      {canRemove && <RemoveOptionButton onClick={onClickRemove} />}
    </div>
  );
}

function AddOptionButton({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick}>
      <ButtonWithChildren
        type="button"
        variant="outline"
        className="flex flex-row w-full md:w-fit justify-start rounded"
      >
        <div className="flex flex-row justify-start items-center w-full">
          <PlusIcon className="size-4" color="#FFFFFF" />
          <Text className="text-sm ml-2">Add another answer</Text>
        </div>
      </ButtonWithChildren>
    </div>
  );
}

function RemoveOptionButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "hover:cursor-pointer hover:bg-destructive flex items-center justify-center rounded-full size-11 aspect-square",
        className,
      )}
    >
      <Trash2Icon className="size-4" />
    </div>
  );
}

function PollFormDuration({
  form,
}: {
  form: UseFormReturn<PollFormSchemaType>;
}) {
  const t = useTranslations("polls");

  const minutesMin =
    pollFormSchema.shape.duration.shape.minutes._def.checks.find(
      (check) => check.kind === "min",
    )?.value;
  const minutesMax =
    pollFormSchema.shape.duration.shape.minutes._def.checks.find(
      (check) => check.kind === "max",
    )?.value;
  const hoursMin = pollFormSchema.shape.duration.shape.hours._def.checks.find(
    (check) => check.kind === "min",
  )?.value;
  const hoursMax = pollFormSchema.shape.duration.shape.hours._def.checks.find(
    (check) => check.kind === "max",
  )?.value;

  const daysMin = pollFormSchema.shape.duration.shape.days._def.checks.find(
    (check) => check.kind === "min",
  )?.value;
  const daysMax = pollFormSchema.shape.duration.shape.days._def.checks.find(
    (check) => check.kind === "max",
  )?.value;

  return (
    <div className="flex flex-col gap-4 w-full">
      <Text>Duration of the poll</Text>
      <div className="flex w-full gap-2">
        <FormFieldInputNumber
          control={form.control}
          name="duration.days"
          className="w-full"
          label={t("days")}
          min={daysMin}
          max={daysMax}
        />
        <FormFieldInputNumber
          control={form.control}
          name="duration.hours"
          label={t("hours")}
          min={hoursMin}
          max={hoursMax}
        />
        <FormFieldInputNumber
          control={form.control}
          name="duration.minutes"
          label={t("minutes")}
          min={minutesMin}
          max={minutesMax}
        />
      </div>
    </div>
  );
}
