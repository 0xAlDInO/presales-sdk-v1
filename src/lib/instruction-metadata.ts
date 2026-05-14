import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import type {
  InstructionFieldMeta,
  InstructionFieldType,
  InstructionMeta,
} from "@/types/instruction";

const INSTRUCTIONS_DIR = path.join(process.cwd(), "src", "generated", "instructions");
const FIELD_PATTERN = /(?:^|\n)\s*(\w+)(\?)?:\s*([^;]+);/g;

function extractTypeBlock(source: string, typeName: string): string | null {
  // Handles generic defaults like `T extends string = string` before the final `= { ... }`.
  const match = source.match(
    new RegExp(`export type ${typeName}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\};?`),
  );
  return match?.[1] ?? null;
}

function toPascalCase(value: string): string {
  return value
    .replace(/(^|[-_])(\w)/g, (_, __, char: string) => char.toUpperCase())
    .replace(/\W/g, "");
}

function toDisplayName(value: string): string {
  const withSpaces = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function parseFieldBlock(block: string): Array<{ name: string; optional: boolean; rawType: string }> {
  const entries: Array<{ name: string; optional: boolean; rawType: string }> = [];

  for (const match of block.matchAll(FIELD_PATTERN)) {
    entries.push({
      name: match[1],
      optional: Boolean(match[2]),
      rawType: match[3].trim(),
    });
  }

  return entries;
}

function inferFieldType(rawType: string): InstructionFieldType {
  if (rawType.includes("TransactionSigner<")) {
    return "walletSigner";
  }
  if (rawType.includes("Address<")) {
    return "publicKey";
  }
  if (/\bboolean\b/.test(rawType)) {
    return "boolean";
  }
  if (/\b(number|bigint)\b/.test(rawType)) {
    return "number";
  }
  return "string";
}

function resolveDataArgType(
  rawType: string,
  dataArgFields: Record<string, string>,
): string {
  const referencedField = rawType.match(/InstructionDataArgs\["(\w+)"\]/)?.[1];
  if (!referencedField) {
    return rawType;
  }
  return dataArgFields[referencedField] ?? rawType;
}

export const getInstructionMetadata = cache(async (): Promise<InstructionMeta[]> => {
  const entries = await fs.readdir(INSTRUCTIONS_DIR, { withFileTypes: true });

  const instructionFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort((a, b) => a.localeCompare(b));

  const metadata = await Promise.all(
    instructionFiles.map(async (fileName) => {
      const filePath = path.join(INSTRUCTIONS_DIR, fileName);
      const source = await fs.readFile(filePath, "utf8");
      const instructionName = fileName.replace(/\.ts$/, "");
      const pascalName = toPascalCase(instructionName);

      const asyncTypeName = `${pascalName}AsyncInput`;
      const dataArgsTypeName = `${pascalName}InstructionDataArgs`;
      const builderName = `get${pascalName}InstructionAsync`;

      const asyncBlock = extractTypeBlock(source, asyncTypeName);

      if (!asyncBlock) {
        return null;
      }

      const dataArgsBlock = extractTypeBlock(source, dataArgsTypeName);

      const dataArgFields = Object.fromEntries(
        (dataArgsBlock ? parseFieldBlock(dataArgsBlock) : []).map((field) => [
          field.name,
          field.rawType,
        ]),
      );

      const fields: InstructionFieldMeta[] = parseFieldBlock(asyncBlock).map((field) => {
        const resolvedType = resolveDataArgType(field.rawType, dataArgFields);
        return {
          name: field.name,
          optional: field.optional,
          rawType: resolvedType,
          type: inferFieldType(resolvedType),
        };
      });

      return {
        name: instructionName,
        displayName: toDisplayName(instructionName),
        fileName,
        builderName,
        asyncInputType: asyncTypeName,
        fields,
      } satisfies InstructionMeta;
    }),
  );

  return metadata.filter((item): item is InstructionMeta => item !== null);
});
