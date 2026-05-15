"use client";

import { useMemo, useState } from "react";

import { InstructionFormCard } from "@/components/instruction-form-card";
import type { InstructionFormValues, InstructionMeta } from "@/types/instruction";

const CREATE_PRESALE_FIELDS = [
  "mint",
  "usdcMint",
  "admin",
  "owner",
  "presaleIndex",
  "presaleDetails",
  "presaleAta",
  "presaleVault",
  "presaleUsdcVaultAta",
  "ownerAta",
  "systemProgram",
  "splTokenProgram",
  "tokenProgram",
  "associatedTokenProgram",
  "id",
  "startingUnixTimestamp",
  "endUnixTimestamp",
  "softCapAmount",
  "hardCapAmount",
  "minimumTokensPerAddress",
  "maximumTokensPerAddress",
  "pricePerToken",
] as const;

const AUTO_RESOLVED_OPTIONAL_FIELDS = [
  "presaleIndex",
  "presaleDetails",
  "presaleAta",
  "presaleVault",
  "presaleUsdcVaultAta",
  "ownerAta",
  "systemProgram",
  "splTokenProgram",
  "tokenProgram",
  "associatedTokenProgram",
] as const;

const BACKEND_MANAGED_FIELDS = ["id"] as const;

type CreatePresalePanelProps = {
  instruction: InstructionMeta | null;
  connectedWallet: string | null;
  disabledReason: string | null;
  isPending: boolean;
  onExecute: (instruction: InstructionMeta, values: InstructionFormValues) => Promise<void>;
};

function orderCreatePresaleFields(instruction: InstructionMeta): InstructionMeta {
  const fieldsByName = new Map(instruction.fields.map((field) => [field.name, field]));

  const orderedFields = CREATE_PRESALE_FIELDS.map((fieldName) => fieldsByName.get(fieldName)).filter(
    (field): field is InstructionMeta["fields"][number] => Boolean(field),
  );

  const extraFields = instruction.fields.filter(
    (field) => !CREATE_PRESALE_FIELDS.includes(field.name as (typeof CREATE_PRESALE_FIELDS)[number]),
  );

  return {
    ...instruction,
    fields: [...orderedFields, ...extraFields],
  };
}

function filterAutoResolvedFields(instruction: InstructionMeta): InstructionMeta {
  const autoResolvedSet = new Set<string>(AUTO_RESOLVED_OPTIONAL_FIELDS);
  return {
    ...instruction,
    fields: instruction.fields.filter((field) => !autoResolvedSet.has(field.name)),
  };
}

function filterBackendManagedFields(instruction: InstructionMeta): InstructionMeta {
  const backendManagedSet = new Set<string>(BACKEND_MANAGED_FIELDS);
  return {
    ...instruction,
    fields: instruction.fields.filter((field) => !backendManagedSet.has(field.name)),
  };
}

export function CreatePresalePanel({
  instruction,
  connectedWallet,
  disabledReason,
  isPending,
  onExecute,
}: CreatePresalePanelProps) {
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const orderedInstruction = useMemo(() => {
    if (!instruction) {
      return null;
    }
    return orderCreatePresaleFields(instruction);
  }, [instruction]);

  const effectiveInstruction = useMemo(() => {
    if (!orderedInstruction) {
      return null;
    }
    const withoutManagedFields = filterBackendManagedFields(orderedInstruction);
    if (showAdvancedFields) {
      return withoutManagedFields;
    }
    return filterAutoResolvedFields(withoutManagedFields);
  }, [orderedInstruction, showAdvancedFields]);

  const fieldAudit = useMemo(() => {
    if (!instruction) {
      return { missing: CREATE_PRESALE_FIELDS, extra: [] as string[] };
    }

    const existing = new Set(instruction.fields.map((field) => field.name));
    const missing = CREATE_PRESALE_FIELDS.filter((fieldName) => !existing.has(fieldName));
    const extra = instruction.fields
      .map((field) => field.name)
      .filter(
        (fieldName) =>
          !CREATE_PRESALE_FIELDS.includes(fieldName as (typeof CREATE_PRESALE_FIELDS)[number]),
      );

    return { missing, extra };
  }, [instruction]);

  return (
    <section className="panel-card space-y-4">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Create Presale</h2>
        <p className="text-sm text-slate-600">
          Formulaire dedie a l&apos;instruction <code>getCreatePresaleInstructionAsync</code>.
          Tous les parametres attendus sont controles ici.
        </p>
        <p className="text-xs text-slate-500">
          Parametres attendus: {CREATE_PRESALE_FIELDS.length} (14 comptes + 8 champs de donnees).
        </p>
        <p className="text-xs text-slate-500">
          Le champ <code>id</code> est gere automatiquement (DB + verification), sans saisie manuelle.
        </p>
        <p className="text-xs text-slate-500">
          Les comptes optionnels auto-resolus par la SDK sont masques par defaut.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p>
          Detectes dans la SDK: {instruction?.fields.length ?? 0} | Manquants: {fieldAudit.missing.length} |
          Supplementaires: {fieldAudit.extra.length}
        </p>
        {fieldAudit.missing.length > 0 ? (
          <p className="mt-2 text-rose-700">
            Champs manquants: {fieldAudit.missing.join(", ")}
          </p>
        ) : (
          <p className="mt-2 text-emerald-700">Aucun champ manquant dans createPresale.</p>
        )}
        {fieldAudit.extra.length > 0 ? (
          <p className="mt-1 text-amber-700">Champs supplementaires: {fieldAudit.extra.join(", ")}</p>
        ) : null}
        <p className="mt-2 text-slate-600">
          Champs auto-resolus: {AUTO_RESOLVED_OPTIONAL_FIELDS.join(", ")}
        </p>
        <p className="mt-1 text-slate-600">
          Champs geres automatiquement: {BACKEND_MANAGED_FIELDS.join(", ")}
        </p>
      </div>

      <button
        type="button"
        className="secondary-btn"
        onClick={() => setShowAdvancedFields((previous) => !previous)}
      >
        {showAdvancedFields ? "Masquer champs avances (auto)" : "Afficher champs avances (override manuel)"}
      </button>

      {effectiveInstruction ? (
        <InstructionFormCard
          instruction={effectiveInstruction}
          connectedWallet={connectedWallet}
          disabledReason={disabledReason}
          isPending={isPending}
          onExecute={onExecute}
        />
      ) : (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Instruction <code>createPresale</code> introuvable dans les fichiers generes.
        </div>
      )}
    </section>
  );
}
