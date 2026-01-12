const TEAM_ACTOR_HEADER = "X-Team-Id";

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
