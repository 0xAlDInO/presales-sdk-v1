"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getChainForEndpoint } from "@solana/wallet-standard-util";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { parseCreatePresaleInstruction } from "@/generated/instructions";

import { buildInstructionInput } from "@/lib/instruction-values";
import {
  getInstructionBuilder,
  sdkInstructionToWeb3Instruction,
} from "@/lib/sdk-runtime";
import {
  decodeProgramError,
  fetchTransactionDiagnostics,
} from "@/lib/transaction-diagnostics";
import type { TransactionDiagnostics } from "@/types/transaction";
import type {
  InstructionFormValues,
  InstructionMeta,
} from "@/types/instruction";

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

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);
const DEVELOPER_FEE_RECEIVER = new PublicKey(
  "2AFocBRFfAcrb97pW1ecGFmgU55csANCXcg3mkLdn4i4",
);
const DEVELOPER_FEE_LAMPORTS = 150_000_000n; // 0.15 SOL
const LAMPORTS_PER_SIGNATURE_FEE = 5_000n;
const LAMPORTS_PER_SOL = 1_000_000_000n;

type SdkInstructionLike = {
  programAddress: string;
  accounts?: ReadonlyArray<{ address: string; role: number }>;
  data?: Uint8Array;
};

type WalletStandardAccountLike = {
  address?: unknown;
  chains?: unknown;
};

type WalletAdapterLike = {
  name?: unknown;
  wallet?: {
    accounts?: unknown;
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Transaction failed unexpectedly.";
}

function readWalletName(walletAdapter: unknown): string {
  const candidate = (walletAdapter as WalletAdapterLike | null)?.name;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : "Selected wallet";
}

function readConnectedWalletChains(
  walletAdapter: unknown,
  connectedWalletAddress: string,
): string[] | null {
  const rawAccounts = (walletAdapter as WalletAdapterLike | null)?.wallet
    ?.accounts;
  if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
    return null;
  }

  const accounts = rawAccounts as WalletStandardAccountLike[];

  const matchingAccount =
    accounts.find((account) => account.address === connectedWalletAddress) ??
    accounts[0];

  const chains = Array.isArray(matchingAccount?.chains)
    ? matchingAccount.chains.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return chains.length > 0 ? chains : null;
}

function isGenericWalletSendError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();
  return (
    normalizedMessage.length === 0 || normalizedMessage === "unexpected error"
  );
}

function buildWalletSendErrorMessage(
  error: unknown,
  walletAdapter: unknown,
  connectedWalletAddress: string,
  endpoint: string,
): string | null {
  const walletName = readWalletName(walletAdapter);
  const expectedChain = getChainForEndpoint(endpoint);
  const supportedChains = readConnectedWalletChains(
    walletAdapter,
    connectedWalletAddress,
  );

  if (supportedChains && !supportedChains.includes(expectedChain)) {
    return `Wallet "${walletName}" does not support the selected RPC chain (${expectedChain}). Supported chains: ${supportedChains.join(", ")}. Switch network in the app or use another wallet.`;
  }

  if (isGenericWalletSendError(error)) {
    console.error(`[useSendTransaction] Generic wallet error for ${walletName}:`, error);
    return `Wallet "${walletName}" failed to send the transaction on ${expectedChain}. Check wallet approval popup, selected network, and SOL balance for fees.`;
  }

  return null;
}

function readApiErrorPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = (payload as { error?: unknown }).error;
  return typeof candidate === "string" ? candidate : null;
}

function readRequiredBigIntField(
  input: Record<string, unknown>,
  key: string,
): bigint {
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

function parseCreatePresaleAccounts(
  instruction: SdkInstructionLike,
): Record<string, string> {
  const kitInstruction = {
    programAddress: instruction.programAddress,
    accounts: (instruction.accounts ?? []).map((acc) => ({
      address: acc.address,
      role: acc.role,
    })),
    data: instruction.data ?? new Uint8Array(),
  };

  const parsed = parseCreatePresaleInstruction(kitInstruction as any);

  const accounts: Record<string, string> = {};
  for (const [key, meta] of Object.entries(parsed.accounts)) {
    accounts[key] = (meta as any).address;
  }
  return accounts;
}

function isCreatePresaleInstruction(instruction: InstructionMeta): boolean {
  return instruction.name === "createPresale";
}

function isBuyTokensInstruction(instruction: InstructionMeta): boolean {
  return (
    instruction.name === "buyTokensWithSol" ||
    instruction.name === "buyTokensWithUsdc"
  );
}

function formatLamportsAsSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole},${fraction}` : whole.toString();
}

function buildCreatePresaleMemoText(
  input: Record<string, unknown>,
  feeLamports: bigint,
): string {
  const hardCapAmount = readRequiredBigIntField(input, "hardCapAmount");
  const pricePerToken = readRequiredBigIntField(input, "pricePerToken");
  const minimumTokensPerAddress = readRequiredBigIntField(
    input,
    "minimumTokensPerAddress",
  );
  const maximumTokensPerAddress = readRequiredBigIntField(
    input,
    "maximumTokensPerAddress",
  );
  const tokensInPresale =
    pricePerToken > 0n ? hardCapAmount / pricePerToken : 0n;
  const tokenRemainder =
    pricePerToken > 0n ? hardCapAmount % pricePerToken : hardCapAmount;

  return [
    "createPresale review",
    `tokens_in_presale=${tokensInPresale.toString()} raw`,
    `developer_fee=${formatLamportsAsSol(feeLamports)} SOL`,
    `network_fee_min=${LAMPORTS_PER_SIGNATURE_FEE.toString()} lamports (${formatLamportsAsSol(
      LAMPORTS_PER_SIGNATURE_FEE,
    )} SOL)`,
    "final_fee_check_phantom_popup",
    "tokens_credited_now=0",
    `buyer_limit=${minimumTokensPerAddress.toString()}-${maximumTokensPerAddress.toString()} raw`,
    `hard_cap=${hardCapAmount.toString()} raw_payment`,
    `price_per_token=${pricePerToken.toString()} raw_payment`,
    tokenRemainder > 0n
      ? `warning=hard_cap_not_divisible,remainder=${tokenRemainder.toString()}`
      : null,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" | ");
}

function encodeMemoData(
  text: string,
): ConstructorParameters<typeof TransactionInstruction>[0]["data"] {
  return new TextEncoder().encode(text) as ConstructorParameters<
    typeof TransactionInstruction
  >[0]["data"];
}

function buildCreatePresaleMemoInstruction(
  input: Record<string, unknown>,
  feeLamports: bigint,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: encodeMemoData(buildCreatePresaleMemoText(input, feeLamports)),
  });
}

function buildCreateAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false },
      { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function buildBuyTokensMemoText(
  instructionName: string,
  input: Record<string, unknown>,
): string {
  const tokensAmount = readRequiredBigIntField(input, "tokensAmount");
  const isSol = instructionName === "buyTokensWithSol";

  return [
    `${instructionName} review`,
    `buying_tokens=${tokensAmount.toString()} raw`,
    `payment_method=${isSol ? "SOL" : "USDC"}`,
    "check_token_balance_after_tx",
  ].join(" | ");
}

function buildBuyTokensMemoInstruction(
  instructionName: string,
  input: Record<string, unknown>,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: encodeMemoData(buildBuyTokensMemoText(instructionName, input)),
  });
}

function buildGenericMemoInstruction(
  instructionName: string,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: encodeMemoData(`${instructionName} via Presales Dashboard`),
  });
}

async function resolveNextCreatePresaleId(
  mintAddress: string,
): Promise<string> {
  const response = await fetch(
    `/api/presales/next-id?mint=${encodeURIComponent(mintAddress)}`,
    {
      method: "GET",
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    nextId?: string;
    error?: string;
  } | null;

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
    throw new Error(
      'Field "mint" is required before resolving createPresale ID.',
    );
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
  const accounts = parseCreatePresaleAccounts(sdkInstruction);

  const payload = {
    id: readRequiredBigIntField(input, "id").toString(),
    mintAddress: accounts.mint,
    usdcMintAddress: accounts.usdcMint,
    adminAddress: accounts.admin,
    ownerAddress: accounts.owner,
    presaleIndexAddress: accounts.presaleIndex,
    presaleDetailsAddress: accounts.presaleDetails,
    presaleAtaAddress: accounts.presaleAta,
    presaleVaultAddress: accounts.presaleVault,
    presaleUsdcVaultAtaAddress: accounts.presaleUsdcVaultAta,
    ownerAtaAddress: accounts.ownerAta,
    systemProgramAddress: accounts.systemProgram,
    splTokenProgramAddress: accounts.splTokenProgram,
    tokenProgramAddress: accounts.tokenProgram,
    associatedTokenProgramAddress: accounts.associatedTokenProgram,
    startingUnixTimestamp: readRequiredBigIntField(
      input,
      "startingUnixTimestamp",
    ).toString(),
    endUnixTimestamp: readRequiredBigIntField(
      input,
      "endUnixTimestamp",
    ).toString(),
    softCapAmount: readRequiredBigIntField(input, "softCapAmount").toString(),
    hardCapAmount: readRequiredBigIntField(input, "hardCapAmount").toString(),
    minimumTokensPerAddress: readRequiredBigIntField(
      input,
      "minimumTokensPerAddress",
    ).toString(),
    maximumTokensPerAddress: readRequiredBigIntField(
      input,
      "maximumTokensPerAddress",
    ).toString(),
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
      readApiErrorPayload(responseBody) ??
        "Failed to persist createPresale in database.",
    );
  }
}

export function useSendTransaction() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet } = useWallet();
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
        const transaction = new Transaction();

        const isCreatePresale = isCreatePresaleInstruction(instruction);
        let feeLamports = 0n;

        if (isCreatePresale) {
          try {
            const configRes = await fetch("/api/config");
            if (configRes.ok) {
              const configData = await configRes.json();
              if (configData && typeof configData.developer_fee_lamports === "string") {
                feeLamports = BigInt(configData.developer_fee_lamports);
              } else {
                feeLamports = DEVELOPER_FEE_LAMPORTS;
              }
            } else {
              feeLamports = DEVELOPER_FEE_LAMPORTS;
            }
          } catch (configErr) {
            console.warn("[useSendTransaction] Failed to fetch dynamic developer fee, falling back to default:", configErr);
            feeLamports = DEVELOPER_FEE_LAMPORTS;
          }
        }

        if (isCreatePresale) {
          transaction.add(buildCreatePresaleMemoInstruction(input, feeLamports));
          if (feeLamports > 0n) {
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: DEVELOPER_FEE_RECEIVER,
                lamports: feeLamports,
              }),
            );
          }

          // Dynamically check and pre-initialize owner's ATA if it does not exist
          try {
            const accounts = parseCreatePresaleAccounts(sdkInstruction as SdkInstructionLike);
            if (accounts.ownerAta && accounts.owner && accounts.mint) {
              const ownerAtaPubkey = new PublicKey(accounts.ownerAta);
              const ownerPubkey = new PublicKey(accounts.owner);
              const mintPubkey = new PublicKey(accounts.mint);

              const accountInfo = await connection.getAccountInfo(ownerAtaPubkey, "confirmed");
              if (!accountInfo) {
                console.log(`[useSendTransaction] Owner ATA (${accounts.ownerAta}) does not exist. Prepending initialization instruction.`);
                transaction.add(
                  buildCreateAssociatedTokenAccountInstruction(
                    publicKey,
                    ownerAtaPubkey,
                    ownerPubkey,
                    mintPubkey,
                  )
                );
              } else {
                console.log(`[useSendTransaction] Owner ATA (${accounts.ownerAta}) already initialized.`);
              }
            }
          } catch (ataError) {
            console.error("[useSendTransaction] Error checking/resolving owner ATA:", ataError);
          }
        } else if (isBuyTokensInstruction(instruction)) {
          transaction.add(buildBuyTokensMemoInstruction(instruction.name, input));
        } else {
          transaction.add(buildGenericMemoInstruction(instruction.name));
        }

        transaction.add(web3Instruction);
        transaction.feePayer = publicKey;

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;

        // Proactive RPC simulation to extract precise on-chain custom error messages before wallet interception
        try {
          const simulation = await connection.simulateTransaction(transaction);
          if (simulation.value.err) {
            const logs = simulation.value.logs ?? [];
            const errorObj = new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
            (errorObj as any).logs = logs;
            throw errorObj;
          }
        } catch (simError) {
          console.warn("[useSendTransaction] Proactive simulation caught error:", simError);
          if (simError instanceof Error && (simError as any).logs) {
            throw simError;
          }
        }

        signature = await sendTransaction(transaction, connection, {
          preflightCommitment: "confirmed",
          skipPreflight: false,
        });

        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed",
        );

        let persistError: Error | null = null;
        if (isCreatePresaleInstruction(instruction)) {
          try {
            await persistValidatedCreatePresale(
              input,
              sdkInstruction as SdkInstructionLike,
              signature,
            );
          } catch (e) {
            persistError = e as Error;
            console.error("Database persistence failed:", e);
          }
        }

        const diagnostics = await fetchTransactionDiagnostics(
          connection,
          signature,
        );

        setExecution({
          status: persistError ? "error" : "success",
          instructionName: instruction.displayName,
          signature,
          error: persistError
            ? `Transaction confirmed (${signature}) but database save failed: ${toErrorMessage(
                persistError,
              )}`
            : null,
          customErrorCode: null,
          customErrorHex: null,
          customErrorMessage: null,
          logs: diagnostics?.logs ?? [],
          diagnostics,
        });

        return signature;
      } catch (error) {
        const decodedError = decodeProgramError(error);
        const walletSendErrorMessage = buildWalletSendErrorMessage(
          error,
          wallet?.adapter ?? null,
          publicKey.toBase58(),
          connection.rpcEndpoint,
        );
        const effectiveErrorMessage =
          walletSendErrorMessage ??
          (error instanceof Error ? error.message : null) ??
          decodedError.userMessage ??
          toErrorMessage(error);

        setExecution({
          status: "error",
          instructionName: instruction.displayName,
          signature,
          error: effectiveErrorMessage,
          customErrorCode: decodedError.customErrorCode,
          customErrorHex: decodedError.customErrorHex,
          customErrorMessage: decodedError.customErrorMessage,
          logs: decodedError.logs,
          diagnostics: null,
        });
        console.error('[useSendTransaction] Raw error:', error, JSON.stringify(error, Object.getOwnPropertyNames(error)));
        throw error;
      }
    },
    [connection, publicKey, sendTransaction, wallet],
  );

  return {
    execution,
    executeInstruction,
    resetExecution,
  };
}
