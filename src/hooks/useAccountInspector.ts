"use client";

import { useCallback, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { decodePresalesAccountData } from "@/lib/account-inspector";
import type {
  AccountInspectorResult,
  AccountInspectorState,
} from "@/types/account-inspector";

const INITIAL_STATE: AccountInspectorState = {
  status: "idle",
  error: null,
  result: null,
};

export function useAccountInspector() {
  const { connection } = useConnection();
  const [state, setState] = useState<AccountInspectorState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const inspect = useCallback(
    async (rawAddress: string) => {
      const address = rawAddress.trim();
      if (!address) {
        setState({
          status: "error",
          error: "Account address is required.",
          result: null,
        });
        return;
      }

      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(address);
      } catch {
        setState({
          status: "error",
          error: "Invalid account address.",
          result: null,
        });
        return;
      }

      setState({ status: "loading", error: null, result: null });

      try {
        const accountInfo = await connection.getAccountInfo(publicKey, "confirmed");

        if (!accountInfo) {
          setState({
            status: "error",
            error: "Account was not found on this network.",
            result: null,
          });
          return;
        }

        const decoded = decodePresalesAccountData(accountInfo.data);

        const result: AccountInspectorResult = {
          address: publicKey.toBase58(),
          accountType: decoded.accountType,
          owner: accountInfo.owner.toBase58(),
          lamports: accountInfo.lamports.toString(),
          executable: accountInfo.executable,
          rentEpoch:
            typeof accountInfo.rentEpoch === "number"
              ? accountInfo.rentEpoch.toString()
              : "unknown",
          dataLength: accountInfo.data.length,
          decodedData: decoded.decodedData,
        };

        setState({ status: "success", error: null, result });
      } catch (error) {
        setState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unable to decode account data.",
          result: null,
        });
      }
    },
    [connection],
  );

  return {
    state,
    inspect,
    reset,
  };
}
