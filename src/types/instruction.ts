export type InstructionFieldType =
  | "publicKey"
  | "number"
  | "string"
  | "boolean"
  | "walletSigner";

export interface InstructionFieldMeta {
  name: string;
  optional: boolean;
  type: InstructionFieldType;
  rawType: string;
}

export interface InstructionMeta {
  name: string;
  displayName: string;
  fileName: string;
  builderName: string;
  asyncInputType: string;
  fields: InstructionFieldMeta[];
}

export type InstructionFormValues = Record<string, string | boolean>;
