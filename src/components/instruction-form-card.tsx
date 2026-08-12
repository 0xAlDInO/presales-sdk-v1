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
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const floatValue = parseFloat(normalized);
  return BigInt(Math.round(floatValue));
}

function formatNumberOrBigInt(value: number | bigint): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatLamportsAsSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole},${fraction}` : whole.toString();
}

function getDerivedTokenAmount(
  capAmount: bigint | null,
  pricePerToken: bigint | null,
) {
  if (capAmount === null || pricePerToken === null || pricePerToken <= 0n) {
    return null;
  }

  const scaledTokens = ((capAmount * 100n) + (pricePerToken / 2n)) / pricePerToken;
  const tokensVal = Number(scaledTokens) / 100;

  return {
    tokens: tokensVal,
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
    <div className="space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 shadow-sm">
      <div>
        <p className="text-sm font-bold text-amber-950">
          A verifier avant de signer dans Phantom
        </p>
        <p className="mt-1 text-amber-800">
          Le popup Phantom ne detaille pas toujours les calculs metier: ce
          resume est aussi ajoute dans la transaction via une instruction Memo
          afin de rendre la signature plus lisible.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
          <p className="font-semibold text-amber-900">
            Nombre de tokens en presale
          </p>
          <p className="mt-1 text-lg font-bold text-amber-950">
            {hardCapTokens
              ? `${formatNumberOrBigInt(hardCapTokens.tokens)} unite(s) token brutes`
              : "A calculer"}
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            Formule: <code>hardCapAmount / pricePerToken</code>. C&apos;est le
            nombre de tokens necessaire pour vendre jusqu&apos;au hard cap.
          </p>
          {hardCapTokens?.remainder && hardCapTokens.remainder > 0n ? (
            <p className="mt-1 text-[11px] font-semibold text-rose-700">
              Attention: division non exacte. Ajustez hardCapAmount ou
              pricePerToken avant signature.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
          <p className="font-semibold text-amber-900">
            Frais a prevoir pour signer
          </p>
          <p className="mt-1 text-lg font-bold text-amber-950">
            ~ 0.15 SOL
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            Ceci inclut les frais de signature ({formatLamportsAsSol(LAMPORTS_PER_SIGNATURE_FEE)} SOL),
            les frais de developpement (0.15 SOL) et la location (rent-exempt) pour les nouveaux comptes.
            Le montant exact sera affiche dans votre wallet.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
          <p className="font-semibold text-amber-900">Soft cap equivalent</p>
          <p className="mt-1 text-lg font-bold text-amber-950">
            {softCapTokens
              ? `${formatNumberOrBigInt(softCapTokens.tokens)} unite(s) token brutes`
              : "A calculer"}
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            Formule: <code>softCapAmount / pricePerToken</code>.
          </p>
          {softCapTokens?.remainder && softCapTokens.remainder > 0n ? (
            <p className="mt-1 text-[11px] font-semibold text-rose-700">
              Attention: soft cap non divisible exactement par pricePerToken.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
          <p className="font-semibold text-amber-900">Limites acheteur</p>
          <p className="mt-1 text-lg font-bold text-amber-950">
            {minimumTokensPerAddress !== null &&
            maximumTokensPerAddress !== null
              ? `${formatNumberOrBigInt(minimumTokensPerAddress)} - ${formatNumberOrBigInt(
                  maximumTokensPerAddress,
                )} tokens bruts / wallet`
              : "A calculer"}
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            Cout max par acheteur:{" "}
            {maxBuyerCost !== null
              ? `${formatNumberOrBigInt(maxBuyerCost)} unite(s) de paiement brutes`
              : "renseignez maximumTokensPerAddress et pricePerToken"}
            .
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
        <p className="font-semibold text-amber-900">
          Tokens credites par cette transaction
        </p>
        <p className="mt-1 text-amber-800">
          <strong>0 token envoye/credite pendant createPresale.</strong> Cette
          instruction configure la presale; elle ne transfere pas de tokens a un
          acheteur. Les montants affiches ci-dessus indiquent combien de tokens
          la presale doit pouvoir couvrir.
        </p>
      </div>

      <p className="text-[11px] text-amber-800">
        Tous les montants sont en unites brutes on-chain. Si votre mint a des
        decimales, convertissez le montant UI avant saisie (ex: 1 token avec 6
        decimales = 1,000,000).
      </p>
      {!hasAllReviewValues ? (
        <p className="text-[11px] font-semibold text-amber-900">
          Completez hardCapAmount, softCapAmount, pricePerToken,
          minimumTokensPerAddress et maximumTokensPerAddress pour afficher les
          valeurs exactes avant d&apos;ouvrir le popup wallet.
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
  const [values, setValues] = useState<InstructionFormValues>(() => {
    const initial = createInitialValues(instruction.fields);
    // Auto-fill Devnet constants
    if (initial.usdcMint === "") {
      initial.usdcMint = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    }
    if (initial.solUsdPriceUpdate === "") {
      initial.solUsdPriceUpdate = "7UVimBoxmYdtS9vS9UAg6zGAsTfBN8EunK8B1wNwnEZY";
    }
    return initial;
  });

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

        {isCreatePresale ? (
          <CreatePresaleSignatureReview values={values} />
        ) : null}

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
