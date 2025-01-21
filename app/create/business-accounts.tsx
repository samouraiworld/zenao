"use client";

import { useClerk } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { zenaoClient } from "../zenao-client";
import { businessAccountsOptions } from "@/lib/queries/businessAccounts";
import { Button } from "@/components/shadcn/button";

export function BusinessAccounts() {
  const { session } = useClerk();

  // XXX: find a better way to do that
  const [token, setToken] = useState<string>();
  useEffect(() => {
    const effect = async () => {
      if (!session) {
        return null;
      }
      const tok = await session.getToken();
      if (!tok) {
        return;
      }
      setToken(tok);
    };
    effect();
  }, [session]);

  let { data } = useQuery(businessAccountsOptions(token));

  if (!data) {
    data = [];
  }

  return (
    <div>
      {data.map((acc) => (
        <div key={acc.id}>
          <div>{acc.id}</div>
          <div>{acc.companyName}</div>
          <div>{acc.email}</div>
          <div>Usable: {acc.canCharge ? "Yes" : "No"}</div>
          <Button
            onClick={async () => {
              const token = await session?.getToken();
              if (!token) {
                throw new Error("invalid auth token");
              }
              const { accountLink } = await zenaoClient.getBusinessAccountLink(
                { id: acc.id },
                { headers: { Authorization: "Bearer " + token } },
              );
              redirect(accountLink);
            }}
          >
            Finish onboarding
          </Button>
        </div>
      ))}
    </div>
  );
}
