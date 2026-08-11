"use client";

import type { InstructionMeta } from "@/types/instruction";

type InstructionNavbarProps = {
  instructions: InstructionMeta[];
  selectedInstructionName: string | null;
  onSelectInstruction: (instructionName: string) => void;
};

export function InstructionNavbar({
  instructions,
  selectedInstructionName,
  onSelectInstruction,
}: InstructionNavbarProps) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Quick Switch
      </p>

      <nav
        className="mt-2 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
        aria-label="Instruction navigation"
      >
        {instructions.map((instruction) => {
          const isActive = instruction.name === selectedInstructionName;

          return (
            <button
              key={instruction.name}
              type="button"
              onClick={() => onSelectInstruction(instruction.name)}
              className={[
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {instruction.displayName}
            </button>
          );
        })}
      </nav>
    </section>
  );
}
