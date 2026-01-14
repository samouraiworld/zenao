import { TEAM_ACTOR_HEADER } from "@/lib/constants";

export function buildQueryHeaders(
  token: string | null,
  teamId?: string,
): HeadersInit {
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (teamId) {
    headers[TEAM_ACTOR_HEADER] = teamId;
  }

  return headers;
}
