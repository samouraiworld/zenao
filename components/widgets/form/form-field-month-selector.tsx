import { FieldValues } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { FormFieldProps } from "@/types/schemas";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

interface FormFieldMonthSelectorProps<T extends FieldValues>
  extends FormFieldProps<T, number> {
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function FormFieldMonthSelector<T extends FieldValues>({
  control,
  name,
  className,
  label,
  disabled = false,
}: FormFieldMonthSelectorProps<T>) {
  const locale = useLocale();
  const tForms = useTranslations("forms");
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <Select
            onValueChange={(value) => field.onChange(Number(value))}
            value={field.value?.toString()}
            disabled={disabled}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue
                placeholder={tForms("month")}
                defaultValue={field.value}
              />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const monthName = new Date(1, i).toLocaleString(locale, {
                  month: "long",
                });
                return (
                  <SelectItem
                    key={month}
                    value={month.toString()}
                    onSelect={() => field.onChange(month)}
                  >
                    {monthName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
