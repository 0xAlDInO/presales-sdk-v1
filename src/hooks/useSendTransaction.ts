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

const CREATE_PRESALE_ACCOUNT_INDEX = {
  mint: 0,
  usdcMint: 1,
  admin: 2,
  owner: 3,
  presaleIndex: 4,
  presaleDetails: 5,
  presaleAta: 6,
  presaleVault: 7,
  presaleUsdcVaultAta: 8,
  ownerAta: 9,
  systemProgram: 10,
  splTokenProgram: 11,
  tokenProgram: 12,
  associatedTokenProgram: 13,
} as const;

type SdkInstructionLike = {
  accounts?: ReadonlyArray<{ address: string }>;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Transaction failed unexpectedly.";
}

function readApiErrorPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = (payload as { error?: unknown }).error;
  return typeof candidate === "string" ? candidate : null;
}

function readRequiredBigIntField(input: Record<string, unknown>, key: string): bigint {
  const value = input[key];

  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }

  throw new Error(`CreatePresale input field "${key}" must be an integer.`);
}

function readCreatePresaleAccountAddress(
  instruction: SdkInstructionLike,
  key: keyof typeof CREATE_PRESALE_ACCOUNT_INDEX,
): string {
  const index = CREATE_PRESALE_ACCOUNT_INDEX[key];
  const address = instruction.accounts?.[index]?.address;

  if (!address) {
    throw new Error(`Missing resolved account "${key}" in createPresale instruction.`);
  }

  return address;
}

function isCreatePresaleInstruction(instruction: InstructionMeta): boolean {
  return instruction.name === "createPresale";
}

async function resolveNextCreatePresaleId(mintAddress: string): Promise<string> {
  const response = await fetch(`/api/presales/next-id?mint=${encodeURIComponent(mintAddress)}`, {
    method: "GET",
  });

  const payload = (await response.json().catch(() => null)) as
    | { nextId?: string; error?: string }
    | null;

  if (!response.ok || typeof payload?.nextId !== "string") {
    throw new Error(
      readApiErrorPayload(payload) ??
        "Unable to resolve createPresale ID from the database.",
    );
  }

  return payload.nextId;
}

async function resolveCreatePresaleValuesFromDatabase(
  values: InstructionFormValues,
): Promise<InstructionFormValues> {
  const mintValue = values.mint;
  if (typeof mintValue !== "string" || mintValue.trim().length === 0) {
    throw new Error("Field \"mint\" is required before resolving createPresale ID.");
  }

  const nextId = await resolveNextCreatePresaleId(mintValue.trim());
  return {
    ...values,
    id: nextId,
  };
}

async function persistValidatedCreatePresale(
  input: Record<string, unknown>,
  sdkInstruction: SdkInstructionLike,
  signature: string,
): Promise<void> {
  const payload = {
    id: readRequiredBigIntField(input, "id").toString(),
    mintAddress: readCreatePresaleAccountAddress(sdkInstruction, "mint"),
    usdcMintAddress: readCreatePresaleAccountAddress(sdkInstruction, "usdcMint"),
    adminAddress: readCreatePresaleAccountAddress(sdkInstruction, "admin"),
    ownerAddress: readCreatePresaleAccountAddress(sdkInstruction, "owner"),
    presaleIndexAddress: readCreatePresaleAccountAddress(sdkInstruction, "presaleIndex"),
    presaleDetailsAddress: readCreatePresaleAccountAddress(sdkInstruction, "presaleDetails"),
    presaleAtaAddress: readCreatePresaleAccountAddress(sdkInstruction, "presaleAta"),
    presaleVaultAddress: readCreatePresaleAccountAddress(sdkInstruction, "presaleVault"),
    presaleUsdcVaultAtaAddress: readCreatePresaleAccountAddress(
      sdkInstruction,
      "presaleUsdcVaultAta",
    ),
    ownerAtaAddress: readCreatePresaleAccountAddress(sdkInstruction, "ownerAta"),
    systemProgramAddress: readCreatePresaleAccountAddress(sdkInstruction, "systemProgram"),
    splTokenProgramAddress: readCreatePresaleAccountAddress(sdkInstruction, "splTokenProgram"),
    tokenProgramAddress: readCreatePresaleAccountAddress(sdkInstruction, "tokenProgram"),
    associatedTokenProgramAddress: readCreatePresaleAccountAddress(
      sdkInstruction,
      "associatedTokenProgram",
    ),
    startingUnixTimestamp: readRequiredBigIntField(input, "startingUnixTimestamp").toString(),
    endUnixTimestamp: readRequiredBigIntField(input, "endUnixTimestamp").toString(),
    softCapAmount: readRequiredBigIntField(input, "softCapAmount").toString(),
    hardCapAmount: readRequiredBigIntField(input, "hardCapAmount").toString(),
    minimumTokensPerAddress: readRequiredBigIntField(input, "minimumTokensPerAddress").toString(),
    maximumTokensPerAddress: readRequiredBigIntField(input, "maximumTokensPerAddress").toString(),
    pricePerToken: readRequiredBigIntField(input, "pricePerToken").toString(),
    txSignature: signature,
  };

  const response = await fetch("/api/presales", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => null);
    throw new Error(
      readApiErrorPayload(responseBody) ?? "Failed to persist createPresale in database.",
    );
  }
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

      let signature: string | null = null;

      try {
        const effectiveValues = isCreatePresaleInstruction(instruction)
          ? await resolveCreatePresaleValuesFromDatabase(values)
          : values;

        const input = buildInstructionInput(
          instruction.fields,
          effectiveValues,
          publicKey.toBase58(),
        );

        const sdkInstruction = await instructionBuilder(input);
        const web3Instruction = sdkInstructionToWeb3Instruction(sdkInstruction);
        const transaction = new Transaction().add(web3Instruction);

        transaction.feePayer = publicKey;

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;

        signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed",
        );

        if (isCreatePresaleInstruction(instruction)) {
          try {
            await persistValidatedCreatePresale(
              input,
              sdkInstruction as SdkInstructionLike,
              signature,
            );
          } catch (persistError) {
            throw new Error(
              `Transaction confirmed (${signature}) but database save failed: ${toErrorMessage(
                persistError,
              )}`,
            );
          }
        }

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
          signature,
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
