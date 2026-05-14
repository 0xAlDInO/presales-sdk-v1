import bs58 from "bs58";
import type {
  Connection,
  ParsedInstruction,
  PartiallyDecodedInstruction,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";

import { getPresalesSmartContractErrorMessage } from "@/generated/errors";
import {
  identifyPresalesSmartContractInstruction,
  PRESALES_SMART_CONTRACT_PROGRAM_ADDRESS,
  PresalesSmartContractInstruction,
} from "@/generated/programs";
import type {
  DecodedProgramErrorDetails,
  TransactionDiagnostics,
} from "@/types/transaction";

const CUSTOM_PROGRAM_ERROR_PATTERN = /custom program error: (0x[0-9a-fA-F]+|\d+)/i;

function parseCustomErrorCode(value: string): number | null {
  const match = value.match(CUSTOM_PROGRAM_ERROR_PATTERN)?.[1];
  if (!match) {
    return null;
  }

  if (match.toLowerCase().startsWith("0x")) {
    return Number.parseInt(match, 16);
  }

  return Number.parseInt(match, 10);
}

function toErrorString(errorValue: unknown): string {
  if (typeof errorValue === "string") {
    return errorValue;
  }

  if (errorValue && typeof errorValue === "object") {
    try {
      return JSON.stringify(errorValue);
    } catch {
      return "Unknown transaction error.";
    }
  }

  return String(errorValue);
}

function extractErrorLogs(error: unknown): string[] {
  if (!error || typeof error !== "object") {
    return [];
  }

  const logsCandidate = (error as { logs?: unknown }).logs;
  if (Array.isArray(logsCandidate)) {
    return logsCandidate
      .filter((item): item is string => typeof item === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function maybeProgramErrorMessage(code: number): string | null {
  const message = getPresalesSmartContractErrorMessage(code as never);

  if (!message || message.includes("not available")) {
    return null;
  }

  return message;
}

function getInstructionLabel(
  instruction: ParsedInstruction | PartiallyDecodedInstruction,
  index: number,
): string {
  const position = `${index + 1}.`;

  if ("parsed" in instruction) {
    const parsedType =
      instruction.parsed &&
      typeof instruction.parsed === "object" &&
      "type" in instruction.parsed
        ? String((instruction.parsed as { type?: unknown }).type ?? "parsed")
        : "parsed";

    return `${position} ${instruction.program}:${parsedType}`;
  }

  const programId = instruction.programId.toBase58();
  if (programId !== PRESALES_SMART_CONTRACT_PROGRAM_ADDRESS) {
    return `${position} ${programId}`;
  }

  try {
    const data = bs58.decode(instruction.data);
    const instructionType = identifyPresalesSmartContractInstruction(data);
    return `${position} presalesSmartContract.${PresalesSmartContractInstruction[instructionType]}`;
  } catch {
    return `${position} presalesSmartContract.(unrecognized)`;
  }
}

function buildInstructionTrace(
  transaction: ParsedTransactionWithMeta,
): string[] {
  return transaction.transaction.message.instructions.map((instruction, index) =>
    getInstructionLabel(instruction, index),
  );
}

export function decodeProgramError(error: unknown): DecodedProgramErrorDetails {
  const baseMessage =
    error instanceof Error ? error.message : "Transaction failed unexpectedly.";

  const logs = extractErrorLogs(error);
  const rawSource = [baseMessage, ...logs].join("\n");
  const customErrorCode = parseCustomErrorCode(rawSource);

  if (customErrorCode === null) {
    return {
      userMessage: baseMessage,
      logs,
      customErrorCode: null,
      customErrorHex: null,
      customErrorMessage: null,
    };
  }

  const customErrorMessage = maybeProgramErrorMessage(customErrorCode);
  const customErrorHex = `0x${customErrorCode.toString(16)}`;

  return {
    userMessage:
      customErrorMessage ??
      `${baseMessage} (Program custom error ${customErrorHex})`,
    logs,
    customErrorCode,
    customErrorHex,
    customErrorMessage,
  };
}

export async function fetchTransactionDiagnostics(
  connection: Connection,
  signature: string,
): Promise<TransactionDiagnostics | null> {
  const transaction = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    return null;
  }

  return {
    signature,
    slot: transaction.slot,
    blockTimeIso: transaction.blockTime
      ? new Date(transaction.blockTime * 1000).toISOString()
      : null,
    feeLamports:
      typeof transaction.meta?.fee === "number"
        ? transaction.meta.fee.toString()
        : null,
    computeUnitsConsumed:
      typeof transaction.meta?.computeUnitsConsumed === "number"
        ? transaction.meta.computeUnitsConsumed
        : null,
    status: transaction.meta?.err ? "failed" : "success",
    metaError: transaction.meta?.err ? toErrorString(transaction.meta.err) : null,
    logs: transaction.meta?.logMessages ?? [],
    instructionTrace: buildInstructionTrace(transaction),
  };
}
