import {
  getBuyerDetailsDecoder,
  getPresaleDetailsDecoder,
  getPresaleIndexDecoder,
  getPriceUpdateV2Decoder,
} from "@/generated/accounts";
import {
  identifyPresalesSmartContractAccount,
  PresalesSmartContractAccount,
} from "@/generated/programs";
import { serializeForDisplay } from "@/lib/serialization";
import type { PresalesAccountType } from "@/types/account-inspector";

export class AccountDecodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountDecodingError";
  }
}

export interface DecodedPresalesAccount {
  accountType: PresalesAccountType;
  decodedData: unknown;
}

export function decodePresalesAccountData(
  data: Uint8Array,
): DecodedPresalesAccount {
  try {
    const accountType = identifyPresalesSmartContractAccount(data);

    switch (accountType) {
      case PresalesSmartContractAccount.BuyerDetails:
        return {
          accountType: "BuyerDetails",
          decodedData: serializeForDisplay(getBuyerDetailsDecoder().decode(data)),
        };
      case PresalesSmartContractAccount.PresaleDetails:
        return {
          accountType: "PresaleDetails",
          decodedData: serializeForDisplay(getPresaleDetailsDecoder().decode(data)),
        };
      case PresalesSmartContractAccount.PresaleIndex:
        return {
          accountType: "PresaleIndex",
          decodedData: serializeForDisplay(getPresaleIndexDecoder().decode(data)),
        };
      case PresalesSmartContractAccount.PriceUpdateV2:
        return {
          accountType: "PriceUpdateV2",
          decodedData: serializeForDisplay(getPriceUpdateV2Decoder().decode(data)),
        };
      default:
        throw new AccountDecodingError("Unsupported account type.");
    }
  } catch (error) {
    if (error instanceof AccountDecodingError) {
      throw error;
    }

    throw new AccountDecodingError(
      error instanceof Error
        ? error.message
        : "Failed to decode account data for this program.",
    );
  }
}
