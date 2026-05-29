import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { type Locale } from "@/app/i18n/config";
import { setLocale } from "@/app/i18n/set-locale";

export function useLocaleChange() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(locale: Locale) {
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return { isPending, handleLocaleChange };
}
