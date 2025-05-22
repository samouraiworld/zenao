import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Switch } from "@/components/shadcn/switch";

type FormFieldSwitchProps<T extends FieldValues> = FormFieldProps<
  T,
  boolean
> & { label?: React.ReactNode };

export function FormFieldSwitch<T extends FieldValues>({
  control,
  name,
  className,
  label,
}: FormFieldSwitchProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <FormControl>
              <Switch
                className={className}
                checked={field.value}
                onCheckedChange={(checked: boolean) => {
                  field.onChange(checked);
                }}
              />
            </FormControl>
            <FormLabel>{label}</FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
