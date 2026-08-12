export type PresalesAccountType =
  | "BuyerDetails"
  | "PresaleDetails"
  | "PresaleIndex"
  | "PriceUpdateV2";

export interface AccountInspectorResult {
  address: string;
  accountType: PresalesAccountType;
  owner: string;
  lamports: string;
  executable: boolean;
  rentEpoch: string;
  dataLength: number;
  decodedData: unknown;
}

export interface AccountInspectorState {
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  result: AccountInspectorResult | null;
}
