"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  deployAndSetUpModule,
  KnownContracts,
  SupportedNetworks,
} from "@gnosis-guild/zodiac";
import { z } from "zod";
import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import {
  useAccount,
  useClient,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import { useWeb3Auth } from "@web3auth/modal/react";
import { rolesAbi } from "zodiac-roles-sdk";
import { encodeFunctionData } from "viem";
import { GetPlanRequest } from "../api/pilot/route";
import { EventForm } from "@/components/features/event/event-form";
import { useToast } from "@/hooks/use-toast";
import { captureException } from "@/lib/report";
import { EventFormSchemaType, eventFormSchema } from "@/types/schemas";
import {
  EventOrganizerRoleKey,
  planApplyEventOrganizerRole,
} from "@/lib/zodiac";
import { useEthersProvider } from "@/lib/ethers-wagmi";
import { profileABI } from "@/lib/evm";

const zenaoAdmin = "0x5CF41F7f586fb46d32683FFf9B76dfa4E262337c";
// Private key: 0xbd6277d9eb47ea66b2d3cf6e32b3566849cd9e49a6cc49e33e5de402fe4aa3e8

export const CreateEventForm: React.FC = () => {
  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      eventFormSchema
        .extend({
          password: z.string().optional(),
        })
        .refine(
          (data) => {
            if (
              data.exclusive &&
              (!data.password || data.password.length < 1)
            ) {
              return false;
            }
            return true;
          },
          {
            message: "Password is required when event is exclusive",
            path: ["password"],
          },
        ),
    ),
    defaultValues: {
      imageUri: "",
      description: "",
      title: "",
      capacity: 1,
      location: {
        kind: "custom",
        address: "",
        timeZone: "",
      },
      exclusive: false,
      password: "",
      gatekeepers: [],
      discoverable: true,
      communityId: null,
    },
  });

  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const ethersProvider = useEthersProvider();

  const { address } = useAccount();
  const client = useClient();
  const { sendTransaction } = useSendTransaction();
  const { provider } = useWeb3Auth();

  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const onSubmitEVM = async (values: EventFormSchemaType) => {
    setIsPending(true);
    try {
      if (!address) {
        throw new Error("no evm address");
      }

      if (!client?.transport) {
        throw new Error("no provider");
      }

      if (!provider) {
        throw new Error("no web3auth provider");
      }

      if (!ethersProvider) {
        throw new Error("no ethers provider");
      }

      const _todo = values;

      const safeAccountConfig: SafeAccountConfig = {
        owners: [zenaoAdmin, address],
        threshold: 1,
        // More optional properties
      };

      const array = new Uint32Array(1);
      self.crypto.getRandomValues(array);
      const nonce = array[0].toString();
      // const nonce = "4242";

      const predictedSafe: PredictedSafeProps = {
        safeAccountConfig,
        safeDeploymentConfig: {
          saltNonce: nonce,
        },
        // More optional properties
      };

      const protocolKit = await Safe.init({
        provider,
        predictedSafe,
        signer: address,
      });

      const safeAddress = await protocolKit.getAddress();
      console.log("predicted safe addr", safeAddress);

      const deploymentTransaction =
        await protocolKit.createSafeDeploymentTransaction();

      const hash = await new Promise<`0x${string}` | undefined>(
        (resolve, reject) => {
          sendTransaction(
            {
              to: deploymentTransaction.to as `0x${string}`,
              value: BigInt(deploymentTransaction.value),
              data: deploymentTransaction.data as `0x${string}`,
            },
            {
              onSettled: async (data, error, variables) => {
                console.log("settled create safe");
                console.log("data", data);
                console.log("error", error);
                console.log("variables", variables);
                if (error !== null) {
                  reject(error);
                  return;
                }
                resolve(data);
              },
            },
          );
        },
      );

      if (!hash) {
        throw new Error("no hash after deploy");
      }

      await waitForTransactionReceipt(client, { hash, confirmations: 2 });

      const deployed = await protocolKit.isSafeDeployed();
      if (!deployed) {
        throw new Error("not deployed after deploy");
      }

      // not sure why we need this but we need it, predicted safe is not enough
      const protocolKit2 = await Safe.init({
        safeAddress,
        provider,
        signer: address,
      });

      const moduleSetup = await deployAndSetUpModule(
        KnownContracts.ROLES_V2,
        {
          types: ["address", "address", "address"],
          values: [safeAddress, safeAddress, safeAddress],
        },
        ethersProvider,
        SupportedNetworks.BaseSepolia,
        nonce,
      );

      const setupRolesModTx = await protocolKit2.createTransaction({
        transactions: [
          {
            ...moduleSetup.transaction,
            value: moduleSetup.transaction.value.toString(),
          },
        ],
      });

      // Deterministic hash based on transaction parameters
      let safeTxHash = await protocolKit2.getTransactionHash(setupRolesModTx);

      console.log("setup roles tx hash", safeTxHash);

      // Sign transaction to verify that the transaction is coming from owner 1
      await protocolKit2.approveTransactionHash(safeTxHash);

      console.log("approved setup roles tx");

      let executeTxResponse =
        await protocolKit2.executeTransaction(setupRolesModTx);

      console.log("executed roles mod setup", executeTxResponse);

      const rolesModAddr = moduleSetup.expectedModuleAddress as `0x${string}`;

      const pilotReq: GetPlanRequest = {
        organizers: [address],
        rolesModAddr,
      };

      const uploadRequest = await fetch("/api/pilot", {
        method: "POST",
        body: JSON.stringify(pilotReq),
      });
      const resRaw = uploadRequest.json();
      const calls = await (resRaw as ReturnType<
        typeof planApplyEventOrganizerRole
      >);
      console.log("planned role update", calls);

      const updateRoleTx = await protocolKit2.createTransaction({
        transactions: calls.map((call) => ({ ...call, value: "0" })),
      });

      // Deterministic hash based on transaction parameters
      safeTxHash = await protocolKit2.getTransactionHash(updateRoleTx);

      console.log("tx hash", safeTxHash);

      // Sign transaction to verify that the transaction is coming from owner 1
      await protocolKit2.approveTransactionHash(safeTxHash);

      console.log("approved tx");

      executeTxResponse = await protocolKit2.executeTransaction(updateRoleTx);

      console.log("updated roles", executeTxResponse);

      const enableModuleTx =
        await protocolKit2.createEnableModuleTx(rolesModAddr);

      // Deterministic hash based on transaction parameters
      safeTxHash = await protocolKit2.getTransactionHash(enableModuleTx);

      console.log("tx hash", safeTxHash);

      // Sign transaction to verify that the transaction is coming from owner 1
      await protocolKit2.approveTransactionHash(safeTxHash);

      console.log("approved tx");

      executeTxResponse = await protocolKit2.executeTransaction(enableModuleTx);

      console.log("enabled roles module");

      const profileContractAddr = process.env
        .NEXT_PUBLIC_EVM_PROFILE_CONTRACT_ADDRESS as `0x${string}`;

      // TODO: only update keys that have been updated
      const keys: string[] = ["pfp", "dn"];
      const txValues: `0x${string}`[] = [
        `0x${Buffer.from(values.imageUri, "utf-8").toString("hex")}`,
        `0x${Buffer.from(values.title, "utf-8").toString("hex")}`,
      ];

      const profileSetData = encodeFunctionData({
        abi: profileABI,
        functionName: "setBatch",
        args: [keys, txValues],
      });

      const res = await writeContractAsync({
        abi: rolesAbi,
        address: rolesModAddr,
        functionName: "execTransactionWithRole",
        args: [
          profileContractAddr, // to
          BigInt(0), // value
          profileSetData, // data
          0, // operation -> Call = 0, DelegateCall = 1
          EventOrganizerRoleKey, // roleKey
          true, // should revert
        ],
      });

      console.log("updated profile", res);

      // router.push(`/event/${safeAddress}`);
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-creation-error"),
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <EventForm
      form={form}
      onSubmit={onSubmitEVM}
      isLoading={isPending}
      minDateRange={new Date()}
    />
  );
};
