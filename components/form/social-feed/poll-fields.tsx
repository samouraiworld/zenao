"use client";

import { Control, useFieldArray, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { FormFieldInputString } from "../components/FormFieldInputString";
import { FeedPostFormSchemaType, pollFormSchema } from "../types";
import { FormFieldInputNumber } from "../components/FormFieldInputNumber";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { cn } from "@/lib/tailwind";
import { FormFieldCheckbox } from "@/components/form/components/form-field-checkbox";
import Text from "@/components/texts/text";

export function PollFields({
  form,
}: {
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const t = useTranslations("event-feed.poll-form");
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
              label={t("label-allow-multiple-answers")}
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
  control: Control<FeedPostFormSchemaType>;
  onClickRemove: () => void;
  canRemove: boolean;
}) {
  const t = useTranslations("event-feed.poll-form");

  return (
    <div className="flex flex-row items-baseline gap-2 w-full">
      <FormFieldInputString
        control={control}
        name={name}
        placeholder={t("option-input-placeholder")}
        className="w-full"
      />
      {canRemove && <RemoveOptionButton onClick={onClickRemove} />}
    </div>
  );
}

function AddOptionButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("event-feed.poll-form");

  return (
    <div onClick={onClick}>
      <ButtonWithChildren
        type="button"
        variant="outline"
        className="flex flex-row w-full md:w-fit justify-start rounded"
      >
        <div className="flex flex-row justify-start items-center w-full">
          <PlusIcon className="size-4 dark:text-white text-black" />
          <Text className="text-sm ml-2">{t("add-other-answer")}</Text>
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
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const t = useTranslations("event-feed.poll-form");

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
      <Text>{t("poll-duration-label")}</Text>
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
