import { useActiveAccount } from "@/components/providers/active-account-provider";
import { TEAM_ACTOR_HEADER } from "@/lib/constants";

export function useHeaderBuilder() {
  const { activeAccount, isTeamContext } = useActiveAccount();

  const buildHeaders = (token: string): HeadersInit => {
    const headers: HeadersInit = { Authorization: "Bearer " + token };
    if (isTeamContext && activeAccount?.id) {
      headers[TEAM_ACTOR_HEADER] = activeAccount.id;
    }
    return headers;
  };

  return { buildHeaders, isTeamContext, activeAccount };
}
