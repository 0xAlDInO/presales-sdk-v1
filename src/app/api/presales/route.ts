import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { upsertValidatedPresale } from "@/lib/server/presales-db";

export const runtime = "nodejs";

type JsonMap = Record<string, unknown>;

function expectString(body: JsonMap, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Field '${key}' is required.`);
  }
  return value.trim();
}

function normalizeAddress(value: string, key: string): string {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`Field '${key}' must be a valid public key.`);
  }
}

function parseBigIntField(
  body: JsonMap,
  key: string,
  options: { allowNegative?: boolean } = {},
): bigint {
  const rawValue = body[key];

  let parsed: bigint;
  if (typeof rawValue === "number") {
    if (!Number.isInteger(rawValue)) {
      throw new Error(`Field '${key}' must be an integer.`);
    }
    parsed = BigInt(rawValue);
  } else if (typeof rawValue === "string" && /^-?\d+$/.test(rawValue.trim())) {
    parsed = BigInt(rawValue.trim());
  } else {
    throw new Error(`Field '${key}' must be an integer.`);
  }

  if (!options.allowNegative && parsed < 0n) {
    throw new Error(`Field '${key}' must be greater than or equal to 0.`);
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JsonMap;

    const id = parseBigIntField(body, "id");
    const mintAddress = normalizeAddress(expectString(body, "mintAddress"), "mintAddress");
    const usdcMintAddress = normalizeAddress(expectString(body, "usdcMintAddress"), "usdcMintAddress");
    const adminAddress = normalizeAddress(expectString(body, "adminAddress"), "adminAddress");
    const ownerAddress = normalizeAddress(expectString(body, "ownerAddress"), "ownerAddress");
    const presaleIndexAddress = normalizeAddress(
      expectString(body, "presaleIndexAddress"),
      "presaleIndexAddress",
    );
    const presaleDetailsAddress = normalizeAddress(
      expectString(body, "presaleDetailsAddress"),
      "presaleDetailsAddress",
    );
    const presaleAtaAddress = normalizeAddress(expectString(body, "presaleAtaAddress"), "presaleAtaAddress");
    const presaleVaultAddress = normalizeAddress(
      expectString(body, "presaleVaultAddress"),
      "presaleVaultAddress",
    );
    const presaleUsdcVaultAtaAddress = normalizeAddress(
      expectString(body, "presaleUsdcVaultAtaAddress"),
      "presaleUsdcVaultAtaAddress",
    );
    const ownerAtaAddress = normalizeAddress(expectString(body, "ownerAtaAddress"), "ownerAtaAddress");
    const systemProgramAddress = normalizeAddress(
      expectString(body, "systemProgramAddress"),
      "systemProgramAddress",
    );
    const splTokenProgramAddress = normalizeAddress(
      expectString(body, "splTokenProgramAddress"),
      "splTokenProgramAddress",
    );
    const tokenProgramAddress = normalizeAddress(
      expectString(body, "tokenProgramAddress"),
      "tokenProgramAddress",
    );
    const associatedTokenProgramAddress = normalizeAddress(
      expectString(body, "associatedTokenProgramAddress"),
      "associatedTokenProgramAddress",
    );
    const txSignature = expectString(body, "txSignature");

    await upsertValidatedPresale({
      id,
      mintAddress,
      usdcMintAddress,
      adminAddress,
      ownerAddress,
      presaleIndexAddress,
      presaleDetailsAddress,
      presaleAtaAddress,
      presaleVaultAddress,
      presaleUsdcVaultAtaAddress,
      ownerAtaAddress,
      systemProgramAddress,
      splTokenProgramAddress,
      tokenProgramAddress,
      associatedTokenProgramAddress,
      startingUnixTimestamp: parseBigIntField(body, "startingUnixTimestamp", { allowNegative: true }),
      endUnixTimestamp: parseBigIntField(body, "endUnixTimestamp", { allowNegative: true }),
      softCapAmount: parseBigIntField(body, "softCapAmount"),
      hardCapAmount: parseBigIntField(body, "hardCapAmount"),
      minimumTokensPerAddress: parseBigIntField(body, "minimumTokensPerAddress"),
      maximumTokensPerAddress: parseBigIntField(body, "maximumTokensPerAddress"),
      pricePerToken: parseBigIntField(body, "pricePerToken"),
      txSignature,
    });

    return NextResponse.json({
      saved: true,
      mintAddress,
      id: id.toString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save presale.";
    const statusCode = /field|required|integer|public key/i.test(message) ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status: statusCode },
    );
  }
}
