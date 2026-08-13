import { NextResponse } from "next/server";
import { getAppConfig, setAppConfig } from "@/lib/server/presales-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const feeStr = await getAppConfig("developer_fee_lamports", "150000000");
    return NextResponse.json({
      developer_fee_lamports: feeStr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load config.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { developer_fee_lamports } = body;

    if (typeof developer_fee_lamports !== "string" || !/^\d+$/.test(developer_fee_lamports)) {
      return NextResponse.json(
        { error: "Field 'developer_fee_lamports' must be a non-negative integer string." },
        { status: 400 },
      );
    }

    await setAppConfig("developer_fee_lamports", developer_fee_lamports);
    return NextResponse.json({
      saved: true,
      developer_fee_lamports,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save config.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
