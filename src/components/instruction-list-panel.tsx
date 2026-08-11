"use client";

import { useMemo, useState } from "react";

import type { InstructionFormValues, InstructionMeta } from "@/types/instruction";
import { InstructionFormCard } from "@/components/instruction-form-card";

type InstructionListPanelProps = {
  instructions: InstructionMeta[];
  connectedWallet: string | null;
  disabledReason: string | null;
  pendingInstructionName: string | null;
  isPending: boolean;
  onExecute: (instruction: InstructionMeta, values: InstructionFormValues) => Promise<void>;
};

export function InstructionListPanel({
  instructions,
  connectedWallet,
  disabledReason,
  pendingInstructionName,
  isPending,
  onExecute,
}: InstructionListPanelProps) {
  const [query, setQuery] = useState("");

  const filteredInstructions = useMemo(() => {
    if (!query.trim()) {
      return instructions;
    }

    const normalizedQuery = query.trim().toLowerCase();
    return instructions.filter((instruction) => {
      return (
        instruction.displayName.toLowerCase().includes(normalizedQuery) ||
        instruction.builderName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [instructions, query]);

  return (
    <section className="panel-card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Instructions</h2>
          <p className="text-sm text-slate-600">
            {filteredInstructions.length} of {instructions.length} generated SDK instructions
          </p>
        </div>
        <input
          className="input-base sm:max-w-56"
          placeholder="Search instruction"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredInstructions.map((instruction) => (
          <InstructionFormCard
            key={instruction.name}
            instruction={instruction}
            connectedWallet={connectedWallet}
            disabledReason={disabledReason}
            isPending={
              isPending && pendingInstructionName === instruction.displayName
            }
            onExecute={onExecute}
          />
        ))}
      </div>
    </section>
  );
}
