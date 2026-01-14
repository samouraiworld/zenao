import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { zenaoClient } from "../zenao-client";

interface CreateTeamRequest {
  token: string;
  userId: string;
  displayName: string;
}

export const useCreateTeam = () => {
  const queryClient = getQueryClient();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, displayName }: CreateTeamRequest) => {
      const result = await zenaoClient.createTeam(
        { displayName },
        { headers: { Authorization: "Bearer " + token } },
      );
      return result.teamId;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["userTeams", variables.userId],
      });
    },
  });

  return {
    createTeam: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
