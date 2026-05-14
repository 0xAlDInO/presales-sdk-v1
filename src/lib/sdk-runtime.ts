import {
  isSignerRole,
  isWritableRole,
  type ReadonlyUint8Array,
} from "@solana/kit";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as sdkInstructions from "@/generated/instructions";

type SdkAccountMeta = {
  address: string;
  role: number;
};

type SdkInstruction = {
  programAddress: string;
  accounts?: readonly SdkAccountMeta[];
  data?: ReadonlyUint8Array;
};

type SdkInstructionBuilder = (
  input: Record<string, unknown>,
  config?: Record<string, unknown>,
) => Promise<SdkInstruction>;

export function getInstructionBuilder(builderName: string): SdkInstructionBuilder | null {
  const candidate = (sdkInstructions as Record<string, unknown>)[builderName];
  if (typeof candidate !== "function") {
    return null;
  }
  return candidate as SdkInstructionBuilder;
}

export function sdkInstructionToWeb3Instruction(
  instruction: SdkInstruction,
): TransactionInstruction {
  const keys = (instruction.accounts ?? []).map((account) => ({
    pubkey: new PublicKey(account.address),
    isSigner: isSignerRole(account.role as never),
    isWritable: isWritableRole(account.role as never),
  }));

  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress),
    keys,
    data: Buffer.from(instruction.data ?? new Uint8Array()),
  });
}
