import { TEAM_ACTOR_HEADER } from "@/lib/constants";
import { getActiveAccountCookie } from "@/lib/active-account/cookie";

function getTeamIdFromCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const account = getActiveAccountCookie();
  return account?.type === "team" ? account.id : undefined;
}

export function buildQueryHeaders(
  token: string | null,
  teamId?: string,
): HeadersInit {
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const effectiveTeamId = teamId ?? getTeamIdFromCookie();
  if (effectiveTeamId) {
    headers[TEAM_ACTOR_HEADER] = effectiveTeamId;
  }

  return headers;
}
