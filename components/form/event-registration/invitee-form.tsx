"use client";

import { Control, useFieldArray, useFormContext } from "react-hook-form";
import {
  CheckCircle2,
  Loader2,
  PlusIcon,
  Trash2Icon,
  XCircle,
} from "lucide-react";
import { FormFieldInputString } from "../components/FormFieldInputString";
import { EventRegistrationFormSchemaType, SubmitStatusInvitee } from ".";
import { cn } from "@/lib/tailwind";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import Text from "@/components/texts/text";

export function InviteeForm({
  userId,
  status,
}: {
  userId?: string | null;
  status: SubmitStatusInvitee;
}) {
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
              loading={status[`emails.${index}.email`] === "loading"}
              success={status[`emails.${index}.email`] === "success"}
              error={status[`emails.${index}.email`] === "error"}
            />
          ))}

          <div className="flex justify-between items-center w-full">
            {optionFields.length < 5 && (
              <AddOptionButton
                onClick={onClickAddOption}
                loading={Object.values(status).some((v) => v === "loading")}
              />
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
  loading,
  success,
  error,
}: {
  name: `emails.${number}.email`;
  control: Control<EventRegistrationFormSchemaType>;
  onClickRemove: () => void;
  canRemove: boolean;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
}) {
  // const t = useTranslations("event-feed.poll-form");

  return (
    <div className="flex flex-row items-baseline gap-2 w-full">
      <FormFieldInputString
        control={control}
        name={name}
        placeholder="E-mail"
        className="w-full"
        disabled={loading}
      />
      {loading && (
        <div className="h-12 flex items-center">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}
      {success && (
        <div className="h-12 flex items-center">
          <CheckCircle2 size={24} className="text-green-400" />
        </div>
      )}
      {error && (
        <div className="h-12 flex items-center">
          <XCircle size={24} className="text-red-400" />
        </div>
      )}
      {!loading && !success && canRemove && (
        <RemoveOptionButton onClick={onClickRemove} />
      )}
    </div>
  );
}

function AddOptionButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  // const t = useTranslations("event-feed.poll-form");

  return (
    <div onClick={onClick}>
      <ButtonWithChildren
        type="button"
        variant="outline"
        className="flex flex-row w-full md:w-fit justify-start rounded"
        disabled={loading}
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
