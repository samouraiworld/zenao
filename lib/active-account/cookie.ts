import { z } from "zod";

export const ACTIVE_ACCOUNT_COOKIE_KEY = "zenao-active-account";

export const activeAccountSchema = z.object({
  type: z.enum(["personal", "team"]),
  id: z.string(),
});

export type ActiveAccount = z.infer<typeof activeAccountSchema>;

export function setActiveAccountCookie(account: ActiveAccount): void {
  const value = JSON.stringify(account);
  document.cookie = `${ACTIVE_ACCOUNT_COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function getActiveAccountCookie(): ActiveAccount | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === ACTIVE_ACCOUNT_COOKIE_KEY) {
      try {
        const value = decodeURIComponent(valueParts.join("="));
        const parsed: unknown = JSON.parse(value); // eslint-disable-line no-restricted-syntax
        const result = activeAccountSchema.safeParse(parsed);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearActiveAccountCookie(): void {
  document.cookie = `${ACTIVE_ACCOUNT_COOKIE_KEY}=; path=/; max-age=0`;
}
