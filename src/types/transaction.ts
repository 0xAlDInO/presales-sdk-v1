export interface TransactionDiagnostics {
  signature: string;
  slot: number;
  blockTimeIso: string | null;
  feeLamports: string | null;
  computeUnitsConsumed: number | null;
  status: "success" | "failed";
  metaError: string | null;
  logs: string[];
  instructionTrace: string[];
}

export interface DecodedProgramErrorDetails {
  userMessage: string;
  logs: string[];
  customErrorCode: number | null;
  customErrorHex: string | null;
  customErrorMessage: string | null;
}
