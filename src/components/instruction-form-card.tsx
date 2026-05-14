"use client";

import { useMemo, useState } from "react";

import type {
  InstructionFieldMeta,
  InstructionFormValues,
  InstructionMeta,
} from "@/types/instruction";

type InstructionFormCardProps = {
  instruction: InstructionMeta;
  connectedWallet: string | null;
  disabledReason: string | null;
  isPending: boolean;
  onExecute: (instruction: InstructionMeta, values: InstructionFormValues) => Promise<void>;
};

function getPlaceholder(field: InstructionFieldMeta): string {
  if (field.name.toLowerCase().includes("addresses")) {
    return "Address1, Address2; Address3";
  }

  switch (field.type) {
    case "publicKey":
      return "Enter base58 public key";
    case "number":
      return "Enter integer value";
    case "string":
      return "Enter text value";
    case "boolean":
      return "true or false";
    default:
      return "";
  }
}

function toFieldLabel(fieldName: string): string {
  const withSpaces = fieldName.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function createInitialValues(fields: InstructionFieldMeta[]): InstructionFormValues {
  return fields.reduce<InstructionFormValues>((accumulator, field) => {
    accumulator[field.name] = field.type === "boolean" ? false : "";
    return accumulator;
  }, {});
}

export function InstructionFormCard({
  instruction,
  connectedWallet,
  disabledReason,
  isPending,
  onExecute,
}: InstructionFormCardProps) {
  const [values, setValues] = useState<InstructionFormValues>(() =>
    createInitialValues(instruction.fields),
  );

  const isBlocked = Boolean(disabledReason) || isPending;

  const signerFields = useMemo(
    () => instruction.fields.filter((field) => field.type === "walletSigner"),
    [instruction.fields],
  );

  const inputFields = useMemo(
    () => instruction.fields.filter((field) => field.type !== "walletSigner"),
    [instruction.fields],
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {instruction.displayName}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{instruction.builderName}</p>
          <p className="mt-1 text-xs text-slate-400">
            {inputFields.length} input field{inputFields.length > 1 ? "s" : ""}
            {signerFields.length > 0
              ? ` | ${signerFields.length} signer account${signerFields.length > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
      </div>

      <form
        className="space-y-4 lg:max-w-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          void onExecute(instruction, values);
        }}
      >
        {signerFields.length > 0 ? (
          <p className="label-base">Signer Accounts</p>
        ) : null}

        {signerFields.map((field) => (
          <div
            key={`${instruction.name}-${field.name}`}
            className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p className="label-base">{toFieldLabel(field.name)}</p>
            <p className="mt-1 text-sm text-slate-600">
              Uses connected wallet signer{field.optional ? " (optional)" : ""}.
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {connectedWallet ?? "No wallet connected"}
            </p>
          </div>
        ))}

        {inputFields.length > 0 ? (
          <p className="label-base">Input Fields</p>
        ) : null}

        {inputFields.map((field) => {
          const inputId = `${instruction.name}-${field.name}`;

          if (field.type === "boolean") {
            return (
              <div
                key={inputId}
                className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <label htmlFor={inputId} className="label-base block">
                  {toFieldLabel(field.name)}
                  {field.optional ? " (optional)" : ""}
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <input
                      id={inputId}
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      checked={Boolean(values[field.name])}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [field.name]: event.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm text-slate-700">True / False</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Key: <code>{field.name}</code> | Type: {field.rawType}
                </p>
              </div>
            );
          }

          return (
            <div
              key={inputId}
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
            >
              <label htmlFor={inputId} className="label-base block">
                {toFieldLabel(field.name)}
                {field.optional ? " (optional)" : ""}
              </label>
              <input
                id={inputId}
                className="input-base block w-full"
                inputMode={field.type === "number" ? "numeric" : "text"}
                placeholder={getPlaceholder(field)}
                value={(values[field.name] as string) ?? ""}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [field.name]: event.target.value,
                  }))
                }
              />
              <p className="text-[11px] text-slate-400">
                Key: <code>{field.name}</code> | Type: {field.rawType}
              </p>
              {field.name.toLowerCase().includes("addresses") ? (
                <p className="text-[11px] text-slate-400">
                  Comma or semicolon separated addresses are accepted.
                </p>
              ) : null}
            </div>
          );
        })}

        <button
          type="submit"
          className="primary-btn"
          disabled={isBlocked}
          title={disabledReason ?? ""}
        >
          {isPending ? "Sending..." : "Send Transaction"}
        </button>

        {disabledReason ? (
          <p className="text-xs text-rose-600">{disabledReason}</p>
        ) : null}
      </form>
    </article>
  );
}
