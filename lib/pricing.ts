import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { communityPayoutStatus } from "@/lib/queries/community";

const currenciesDecimalMapping: Record<string, 0 | 3> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  MGA: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  JOD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
} as const;

export const currencyMinorUnit = (currencyCode: string) => {
  if (currenciesDecimalMapping.hasOwnProperty(currencyCode.toUpperCase())) {
    return currenciesDecimalMapping[currencyCode.toUpperCase()];
  }

  return 2;
};

export const currencyFormStep = (currencyCode: string) => {
  return {
    0: 1,
    2: 0.01,
    3: 0.001,
  }[currencyMinorUnit(currencyCode)];
};

export const toMinorUnits = (amount: number, currencyCode: string) => {
  if (currencyCode === "" || amount === 0) {
    return BigInt(0);
  }

  const decimals = currencyMinorUnit(currencyCode);
  const factor = 10 ** decimals;
  return BigInt(Math.round(amount * factor));
};

export const fromMinorUnits = (
  amountMinor: number | bigint,
  currencyCode: string,
) => {
  const decimals = currencyMinorUnit(currencyCode);
  const factor = 10 ** decimals;
  return Number(amountMinor) / factor;
};

export const formatPrice = (
  amountMinor: number | bigint,
  currencyCode: string,
  options: { freeLabel?: string } = {},
) => {
  if (amountMinor === 0 || currencyCode.trim() === "") {
    return options.freeLabel ?? "";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: currencyMinorUnit(currencyCode),
    }).format(fromMinorUnits(amountMinor, currencyCode));
  } catch {
    return `${fromMinorUnits(amountMinor, currencyCode)} ${currencyCode.toUpperCase()}`;
  }
};

export const useCurrencyOptionsForCommunity = (communityId: string | null) => {
  const { getToken } = useAuth();
  const { data: payoutStatus } = useQuery({
    ...communityPayoutStatus(communityId ?? "", getToken),
    enabled: !!communityId,
  });

  const t = useTranslations("eventForm");

  return useMemo(() => {
    const currencies = payoutStatus?.currencies ?? [];
    const options = currencies.map((currency) => ({
      value: currency.toUpperCase(),
      label: currency.toUpperCase(),
    }));
    return [{ value: "", label: t("currency-free-option") }, ...options];
  }, [payoutStatus?.currencies, t]);
};
