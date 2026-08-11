import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { getNextPresaleIdForMint } from "@/lib/server/presales-db";

export const runtime = "nodejs";

function normalizeMint(value: string | null): string {
  if (!value?.trim()) {
    throw new Error("Query parameter 'mint' is required.");
  }

  try {
    return new PublicKey(value.trim()).toBase58();
  } catch {
    throw new Error("Invalid mint address.");
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mint = normalizeMint(url.searchParams.get("mint"));
    const nextId = await getNextPresaleIdForMint(mint);

    return NextResponse.json({
      mint,
      nextId: nextId.toString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve next presale ID.";
    const statusCode = /required|invalid/i.test(message) ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status: statusCode },
    );
  }
}
