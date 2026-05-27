"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Control,
  FieldPathByValue,
  FieldValues,
  useController,
  useWatch,
} from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { currencyMinorUnit } from "@/lib/pricing";
import { cn } from "@/lib/tailwind";

const parseBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    return value === "" ? BigInt(0) : BigInt(value);
  }
  return BigInt(0);
};

const normalizeInput = (raw: string) => {
  const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [head, ...rest] = cleaned.split(".");
  if (rest.length === 0) {
    return head;
  }
  return `${head}.${rest.join("")}`;
};

const parseMinorUnits = (raw: string, decimals: number) => {
  const normalized = normalizeInput(raw);
  if (normalized === "") {
    return BigInt(0);
  }
  const [intPart, fracPart = ""] = normalized.split(".");
  const safeInt = intPart === "" ? "0" : intPart;
  if (decimals === 0) {
    return BigInt(safeInt);
  }
  const trimmedFraction = fracPart.slice(0, decimals);
  const paddedFraction = trimmedFraction.padEnd(decimals, "0");
  const factor = BigInt(10 ** decimals);
  return BigInt(safeInt) * factor + BigInt(paddedFraction || "0");
};

const formatMinorUnits = (amountMinor: bigint, decimals: number) => {
  if (decimals === 0) {
    return amountMinor.toString();
  }
  const negative = amountMinor < BigInt(0);
  const abs = negative ? -amountMinor : amountMinor;
  const factor = BigInt(10 ** decimals);
  const integerPart = abs / factor;
  const fractionPart = abs % factor;
  const fraction = fractionPart.toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${integerPart.toString()}.${fraction}`;
};

type FormFieldInputPriceNumberProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPathByValue<T, bigint>;
  currencyName: FieldPathByValue<T, string | undefined>;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export const FormFieldInputPriceNumber = <T extends FieldValues>({
  control,
  name,
  currencyName,
  label,
  placeholder,
  className,
  disabled = false,
}: FormFieldInputPriceNumberProps<T>) => {
  const { field } = useController({ control, name });
  const currencyCode = useWatch({ control, name: currencyName }) ?? "";

  const amountMinor = useMemo(() => parseBigInt(field.value), [field.value]);
  const decimals = useMemo(
    () => (currencyCode ? currencyMinorUnit(currencyCode) : 2),
    [currencyCode],
  );

  const formattedValue = useMemo(
    () => formatMinorUnits(amountMinor, decimals),
    [amountMinor, decimals],
  );
  const [inputValue, setInputValue] = useState(() => formattedValue);
  const isEditingRef = useRef(false);
  const lastFormattedRef = useRef(formattedValue);

  useEffect(() => {
    if (!isEditingRef.current && lastFormattedRef.current !== formattedValue) {
      lastFormattedRef.current = formattedValue;
      setInputValue(formattedValue);
    }
  }, [formattedValue]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={placeholder}
              className={cn(className)}
              disabled={disabled}
              value={inputValue}
              onFocus={() => {
                isEditingRef.current = true;
              }}
              onBlur={() => {
                isEditingRef.current = false;
                lastFormattedRef.current = formattedValue;
                setInputValue(formattedValue);
                field.onBlur();
              }}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === inputValue) {
                  return;
                }
                setInputValue(raw);
                field.onChange(parseMinorUnits(raw, decimals));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
