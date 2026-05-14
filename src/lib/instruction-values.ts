import type { TransactionSigner } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

import type {
  InstructionFieldMeta,
  InstructionFormValues,
} from "@/types/instruction";

export class InstructionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstructionInputError";
  }
}

export interface WhitelistValidationResult {
  entries: string[];
  invalidEntries: string[];
}

function createWalletSigner(address: string): TransactionSigner {
  const signer = {
    address,
    signTransactions: async (transactions: readonly unknown[]) =>
      transactions.map(() => Object.freeze({})),
  };

  return signer as unknown as TransactionSigner;
}

function parseBoolean(value: string | boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  throw new InstructionInputError(`Expected boolean value, received "${value}".`);
}

function parseNumberAsBigInt(value: string): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new InstructionInputError(
      `Expected integer number, received "${value}".`,
    );
  }
  return BigInt(trimmed);
}

function parsePublicKey(value: string): string {
  try {
    return new PublicKey(value.trim()).toBase58();
  } catch {
    throw new InstructionInputError(`Invalid public key: "${value}".`);
  }
}

function normalizeAddressesList(value: string): string {
  const tokens = value
    .split(/[;,]/g)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  const normalized: string[] = [];
  for (const token of tokens) {
    normalized.push(parsePublicKey(token));
  }

  return normalized.join(",");
}

export function buildInstructionInput(
  fields: InstructionFieldMeta[],
  values: InstructionFormValues,
  walletAddress: string | null,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === "walletSigner") {
      if (!walletAddress) {
        throw new InstructionInputError(
          `Wallet must be connected for signer field "${field.name}".`,
        );
      }
      input[field.name] = createWalletSigner(walletAddress);
      continue;
    }

    const rawValue = values[field.name];
    const normalized =
      typeof rawValue === "boolean" ? rawValue : (rawValue ?? "").toString().trim();

    if (
      field.optional &&
      (normalized === "" || normalized === undefined || normalized === null)
    ) {
      continue;
    }

    if (
      !field.optional &&
      (normalized === "" || normalized === undefined || normalized === null)
    ) {
      throw new InstructionInputError(`Field "${field.name}" is required.`);
    }

    switch (field.type) {
      case "publicKey": {
        input[field.name] = parsePublicKey(normalized.toString());
        break;
      }
      case "number": {
        input[field.name] = parseNumberAsBigInt(normalized.toString());
        break;
      }
      case "boolean": {
        input[field.name] = parseBoolean(normalized);
        break;
      }
      case "string": {
        if (field.name.toLowerCase().includes("addresses")) {
          input[field.name] = normalizeAddressesList(normalized.toString());
        } else {
          input[field.name] = normalized.toString();
        }
        break;
      }
      default: {
        input[field.name] = normalized;
      }
    }
  }

  return input;
}

export function parseWhitelistInput(value: string): WhitelistValidationResult {
  const tokens = value
    .split(/[;,]/g)
    .map((token) => token.trim())
    .filter(Boolean);

  const valid = new Set<string>();
  const invalid = new Set<string>();

  for (const token of tokens) {
    try {
      valid.add(new PublicKey(token).toBase58());
    } catch {
      invalid.add(token);
    }
  }

  return {
    entries: Array.from(valid),
    invalidEntries: Array.from(invalid),
  };
}
