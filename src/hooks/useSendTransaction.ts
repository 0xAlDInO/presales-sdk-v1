"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

import { buildInstructionInput } from "@/lib/instruction-values";
import { getInstructionBuilder, sdkInstructionToWeb3Instruction } from "@/lib/sdk-runtime";
import {
  decodeProgramError,
  fetchTransactionDiagnostics,
} from "@/lib/transaction-diagnostics";
import type { TransactionDiagnostics } from "@/types/transaction";
import type { InstructionFormValues, InstructionMeta } from "@/types/instruction";

type TransactionStatus = "idle" | "pending" | "success" | "error";

export interface TransactionExecutionState {
  status: TransactionStatus;
  instructionName: string | null;
  signature: string | null;
  error: string | null;
  customErrorCode: number | null;
  customErrorHex: string | null;
  customErrorMessage: string | null;
  logs: string[];
  diagnostics: TransactionDiagnostics | null;
}

const INITIAL_STATE: TransactionExecutionState = {
  status: "idle",
  instructionName: null,
  signature: null,
  error: null,
  customErrorCode: null,
  customErrorHex: null,
  customErrorMessage: null,
  logs: [],
  diagnostics: null,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Transaction failed unexpectedly.";
}

export function useSendTransaction() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [execution, setExecution] =
    useState<TransactionExecutionState>(INITIAL_STATE);

  const resetExecution = useCallback(() => {
    setExecution(INITIAL_STATE);
  }, []);

  const executeInstruction = useCallback(
    async (instruction: InstructionMeta, values: InstructionFormValues) => {
      if (!publicKey) {
        throw new Error("Connect wallet before sending a transaction.");
      }

      const instructionBuilder = getInstructionBuilder(instruction.builderName);
      if (!instructionBuilder) {
        throw new Error(
          `Instruction builder "${instruction.builderName}" was not found in generated SDK.`,
        );
      }

      setExecution({
        status: "pending",
        instructionName: instruction.displayName,
        signature: null,
        error: null,
        customErrorCode: null,
        customErrorHex: null,
        customErrorMessage: null,
        logs: [],
        diagnostics: null,
      });

      try {
        const input = buildInstructionInput(
          instruction.fields,
          values,
          publicKey.toBase58(),
        );

        const sdkInstruction = await instructionBuilder(input);
        const web3Instruction = sdkInstructionToWeb3Instruction(sdkInstruction);
        const transaction = new Transaction().add(web3Instruction);

        transaction.feePayer = publicKey;

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed",
        );

        const diagnostics = await fetchTransactionDiagnostics(connection, signature);

        setExecution({
          status: "success",
          instructionName: instruction.displayName,
          signature,
          error: null,
          customErrorCode: null,
          customErrorHex: null,
          customErrorMessage: null,
          logs: diagnostics?.logs ?? [],
          diagnostics,
        });

        return signature;
      } catch (error) {
        const decodedError = decodeProgramError(error);

        setExecution({
          status: "error",
          instructionName: instruction.displayName,
          signature: null,
          error: decodedError.userMessage || toErrorMessage(error),
          customErrorCode: decodedError.customErrorCode,
          customErrorHex: decodedError.customErrorHex,
          customErrorMessage: decodedError.customErrorMessage,
          logs: decodedError.logs,
          diagnostics: null,
        });
        throw error;
      }
    },
    [connection, publicKey, sendTransaction],
  );

  return {
    execution,
    executeInstruction,
    resetExecution,
  };
}
