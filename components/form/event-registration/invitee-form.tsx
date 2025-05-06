"use client";

import { Control, useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { FormFieldInputString } from "../components/FormFieldInputString";
import { EventRegistrationFormSchemaType } from ".";
import { cn } from "@/lib/tailwind";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import Text from "@/components/texts/text";

export function InviteeForm({ userId }: { userId?: string | null }) {
  const { control } = useFormContext<EventRegistrationFormSchemaType>();

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: "emails",
  });

  const onClickAddOption = () => {
    appendOption({ email: "" });
  };

  return (
    <div className="flex w-full sm:flex-row items-center sm:h-full">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-2">
          {optionFields.map((field, index) => (
            <InviteeFormItem
              key={field.id}
              name={`emails.${index}.email`}
              control={control}
              onClickRemove={() => removeOption(index)}
              canRemove={!userId ? optionFields.length > 1 : true}
            />
          ))}

          <div className="flex justify-between items-center w-full">
            {optionFields.length < 5 && (
              <AddOptionButton onClick={onClickAddOption} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteeFormItem({
  name,
  control,
  onClickRemove,
  canRemove,
}: {
  name: `emails.${number}.email`;
  control: Control<EventRegistrationFormSchemaType>;
  onClickRemove: () => void;
  canRemove: boolean;
}) {
  // const t = useTranslations("event-feed.poll-form");

  return (
    <div className="flex flex-row items-center gap-2 w-full">
      <FormFieldInputString
        control={control}
        name={name}
        placeholder="E-mail"
        className="w-full"
      />
      {canRemove && <RemoveOptionButton onClick={onClickRemove} />}
    </div>
  );
}

function AddOptionButton({ onClick }: { onClick: () => void }) {
  // const t = useTranslations("event-feed.poll-form");

  return (
    <div onClick={onClick}>
      <ButtonWithChildren
        type="button"
        variant="outline"
        className="flex flex-row w-full md:w-fit justify-start rounded"
      >
        <div className="flex flex-row justify-start items-center w-full">
          <PlusIcon className="size-4 dark:text-white text-black" />
          <Text className="text-sm ml-2">Register for a friend</Text>
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
