import { FieldValues } from "react-hook-form";
import {
  FormControl,
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
import { FormFieldProps } from "@/types/schemas";

export const FormFieldInputCurrency = <T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  emptyValue,
  currencyOptions,
}: FormFieldProps<T, string> & {
  label?: string;
  disabled?: boolean;
  emptyValue: string;
  currencyOptions: { label: string; value: string }[];
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className="w-full">
        <FormLabel>{label}</FormLabel>
        <Select
          value={field.value === "" ? emptyValue : (field.value ?? "")}
          onValueChange={(value) =>
            field.onChange(value === emptyValue ? "" : value)
          }
          disabled={disabled}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder={label} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {currencyOptions.map((option) => (
              <SelectItem
                key={option.value || emptyValue}
                value={option.value === "" ? emptyValue : option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);
