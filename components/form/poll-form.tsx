"use client";

import { Control, useFieldArray, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Card } from "../cards/Card";
import { SmallText } from "../texts/SmallText";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { PollFormSchemaType } from "./types";
import { Form } from "@/components/shadcn/form";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { cn } from "@/lib/tailwind";
import { currentTimezone } from "@/lib/time";
import { FormFieldCheckbox } from "@/components/form/components/form-field-checkbox";

export function PollForm({
  form,
  onSubmit,
  isLoading,
}: {
  form: UseFormReturn<PollFormSchemaType>;
  onSubmit: (values: PollFormSchemaType) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const t = useTranslations("eventForm");

  const onClickAddOption = () => {
    appendOption({ text: "" });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (e) => {
          console.log("s,nbezg,ekl", e);
        })}
        className="flex w-full sm:flex-row items-center sm:h-full"
      >
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
            {optionFields.length < 9 && (
              <AddOptionButton onClick={onClickAddOption} />
            )}
          </div>

          <Card>
            <FormFieldDatePicker
              name="endDate"
              control={form.control}
              placeholder={t("end-date-placeholder")}
              timeZone={currentTimezone()}
            />
          </Card>

          <Card>
            <FormFieldCheckbox
              name="allowMultipleOptions"
              control={form.control}
              label="Allow multiple answers"
            />
          </Card>
        </div>
      </form>
    </Form>
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
      <Card className="w-full">
        <FormFieldInputString
          control={control}
          name={name}
          placeholder="Enter an answer"
        />
      </Card>
      {canRemove && <RemoveOptionButton onClick={onClickRemove} />}
    </div>
  );
}

function AddOptionButton({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick}>
      <ButtonWithChildren
        type="button"
        variant="ghost"
        className="flex flex-row w-full justify-start hover:bg-neutral-700 rounded-full"
      >
        <div className="flex flex-row justify-start items-center w-full">
          <PlusIcon className="size-4" color="#FFFFFF" />
          <SmallText className="ml-2">Add another answer</SmallText>
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
