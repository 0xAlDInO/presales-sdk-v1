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
  onExecute: (
    instruction: InstructionMeta,
    values: InstructionFormValues,
  ) => Promise<void>;
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

const LAMPORTS_PER_SIGNATURE_FEE = 5_000n;
const LAMPORTS_PER_SOL = 1_000_000_000n;

const CREATE_PRESALE_REVIEW_FIELDS = [
  "softCapAmount",
  "hardCapAmount",
  "minimumTokensPerAddress",
  "maximumTokensPerAddress",
  "pricePerToken",
] as const;

function readStringValue(values: InstructionFormValues, key: string): string {
  const value = values[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseUnsignedInteger(value: string): bigint | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  return BigInt(value);
}

function formatBigInt(value: bigint): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatLamportsAsSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function getDerivedTokenAmount(
  capAmount: bigint | null,
  pricePerToken: bigint | null,
) {
  if (capAmount === null || pricePerToken === null || pricePerToken <= 0n) {
    return null;
  }

  return {
    tokens: capAmount / pricePerToken,
    remainder: capAmount % pricePerToken,
  };
}

function CreatePresaleSignatureReview({
  values,
}: {
  values: InstructionFormValues;
}) {
  const softCapAmount = parseUnsignedInteger(
    readStringValue(values, "softCapAmount"),
  );
  const hardCapAmount = parseUnsignedInteger(
    readStringValue(values, "hardCapAmount"),
  );
  const minimumTokensPerAddress = parseUnsignedInteger(
    readStringValue(values, "minimumTokensPerAddress"),
  );
  const maximumTokensPerAddress = parseUnsignedInteger(
    readStringValue(values, "maximumTokensPerAddress"),
  );
  const pricePerToken = parseUnsignedInteger(
    readStringValue(values, "pricePerToken"),
  );
  const softCapTokens = getDerivedTokenAmount(softCapAmount, pricePerToken);
  const hardCapTokens = getDerivedTokenAmount(hardCapAmount, pricePerToken);
  const maxBuyerCost =
    maximumTokensPerAddress !== null && pricePerToken !== null
      ? maximumTokensPerAddress * pricePerToken
      : null;
  const hasAllReviewValues = CREATE_PRESALE_REVIEW_FIELDS.every((fieldName) =>
    /^\d+$/.test(readStringValue(values, fieldName)),
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">Resume avant signature Phantom</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <span className="font-medium">Tokens a crediter maintenant:</span>{" "}
          aucun transfert de tokens n&apos;est demande par{" "}
          <code>createPresale</code>. Cette transaction configure la presale et
          ses comptes.
        </li>
        <li>
          <span className="font-medium">
            Tokens a prevoir pour couvrir le hard cap:
          </span>{" "}
          {hardCapTokens ? (
            <>
              {formatBigInt(hardCapTokens.tokens)} unite(s) token brutes
              {hardCapTokens.remainder > 0n
                ? " (attention: hardCapAmount n'est pas divisible exactement par pricePerToken)"
                : ""}
            </>
          ) : (
            "renseignez hardCapAmount et pricePerToken."
          )}
        </li>
        <li>
          <span className="font-medium">Soft cap equivalent:</span>{" "}
          {softCapTokens
            ? `${formatBigInt(softCapTokens.tokens)} unite(s) token brutes${
                softCapTokens.remainder > 0n
                  ? " (division non exacte avec pricePerToken)"
                  : ""
              }`
            : "renseignez softCapAmount et pricePerToken."}
        </li>
        <li>
          <span className="font-medium">Limites acheteur:</span>{" "}
          {minimumTokensPerAddress !== null && maximumTokensPerAddress !== null
            ? `${formatBigInt(minimumTokensPerAddress)} a ${formatBigInt(
                maximumTokensPerAddress,
              )} unite(s) token brutes par wallet`
            : "renseignez minimumTokensPerAddress et maximumTokensPerAddress."}
        </li>
        <li>
          <span className="font-medium">Cout max par acheteur:</span>{" "}
          {maxBuyerCost !== null
            ? `${formatBigInt(maxBuyerCost)} unite(s) de paiement brutes`
            : "renseignez maximumTokensPerAddress et pricePerToken."}
        </li>
        <li>
          <span className="font-medium">Frais wallet:</span> prevoyez au minimum
          environ {formatBigInt(LAMPORTS_PER_SIGNATURE_FEE)} lamports (
          {formatLamportsAsSol(LAMPORTS_PER_SIGNATURE_FEE)} SOL) de frais
          reseau, plus assez de SOL devnet si le programme cree des comptes
          rent-exempt.
        </li>
      </ul>
      <p className="mt-2 text-[11px] text-amber-800">
        Les montants sont en unites brutes on-chain. Si votre mint a des
        decimales, convertissez le montant UI avant saisie (ex: 1 token avec 6
        decimales = 1,000,000).
      </p>
      {!hasAllReviewValues ? (
        <p className="mt-2 text-[11px] font-medium text-amber-800">
          Completez les champs numeriques pour afficher tous les calculs avant
          d&apos;ouvrir le popup wallet.
        </p>
      ) : null}
    </div>
  );
}

function createInitialValues(
  fields: InstructionFieldMeta[],
): InstructionFormValues {
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

  const isCreatePresale = instruction.name === "createPresale";
  const createPresaleIdBlockReason = useMemo(() => {
    if (!isCreatePresale) {
      return null;
    }
    const mintValue = typeof values.mint === "string" ? values.mint.trim() : "";
    if (!mintValue) {
      return "Mint requis pour recuperer l'ID depuis la base.";
    }
    return null;
  }, [isCreatePresale, values.mint]);
  const submitDisabledReason = disabledReason ?? createPresaleIdBlockReason;
  const isBlocked = Boolean(submitDisabledReason) || isPending;

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
          <p className="mt-1 text-xs text-slate-500">
            {instruction.builderName}
          </p>
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
        {isCreatePresale ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p>
                Le champ <code>id</code> est gere automatiquement via le{" "}
                <code>mint</code>. Aucun ID manuel n&apos;est requis. Pour un
                nouveau token, la sequence commence a <code>0</code>.
              </p>
            </div>
            <CreatePresaleSignatureReview values={values} />
          </>
        ) : null}

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
          title={submitDisabledReason ?? ""}
        >
          {isPending ? "Sending..." : "Send Transaction"}
        </button>

        {submitDisabledReason ? (
          <p className="text-xs text-rose-600">{submitDisabledReason}</p>
        ) : null}
      </form>
    </article>
  );
}
