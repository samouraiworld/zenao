import "server-only";
import { cookies } from "next/headers";
import {
  ACTIVE_ACCOUNT_COOKIE_KEY,
  activeAccountSchema,
  type ActiveAccount,
} from "./cookie";

export async function getActiveAccountServer(): Promise<ActiveAccount | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACTIVE_ACCOUNT_COOKIE_KEY);

  if (!cookie?.value) {
    return null;
  }

  try {
    const value = decodeURIComponent(cookie.value);
    const parsed: unknown = JSON.parse(value); // eslint-disable-line no-restricted-syntax
    const result = activeAccountSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function getTeamIdFromActiveAccount(
  activeAccount: ActiveAccount | null,
): string | undefined {
  if (activeAccount?.type === "team") {
    return activeAccount.id;
  }
  return undefined;
}
