"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AccountInspectorPanel } from "@/components/account-inspector-panel";
import { CreatePresalePanel } from "@/components/create-presale-panel";
import { ExecutionResultPanel } from "@/components/execution-result-panel";
import { InstructionFormCard } from "@/components/instruction-form-card";
import { InstructionNavbar } from "@/components/instruction-navbar";
import { WalletPanel } from "@/components/wallet-panel";
import { useSendTransaction } from "@/hooks/useSendTransaction";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { parseWhitelistInput } from "@/lib/instruction-values";
import type { InstructionFormValues, InstructionMeta } from "@/types/instruction";

type DashboardProps = {
  instructions: InstructionMeta[];
};

const INSTRUCTION_NAV_PRIORITY = [
  "createPresale",
  "buyTokensWithSol",
  "buyTokensWithUsdc",
] as const;

function sortInstructionsForNavbar(instructions: InstructionMeta[]): InstructionMeta[] {
  const priority = new Map<string, number>(
    INSTRUCTION_NAV_PRIORITY.map((name, index) => [name, index]),
  );

  return [...instructions].sort((a, b) => {
    const priorityA = priority.get(a.name);
    const priorityB = priority.get(b.name);

    if (priorityA !== undefined && priorityB !== undefined) {
      return priorityA - priorityB;
    }
    if (priorityA !== undefined) {
      return -1;
    }
    if (priorityB !== undefined) {
      return 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

export function Dashboard({ instructions }: DashboardProps) {
  const {
    connected,
    connecting,
    endpoint,
    network,
    onNetworkChange,
    openWalletModal,
    disconnectWallet,
    walletAddress,
    shortWalletAddress,
  } = useWalletConnection();

  const { execution, executeInstruction, resetExecution } = useSendTransaction();
  const [whitelistInput, setWhitelistInput] = useState("");
  const [selectedInstructionName, setSelectedInstructionName] = useState<string | null>(
    null,
  );

  const whitelist = useMemo(
    () => parseWhitelistInput(whitelistInput),
    [whitelistInput],
  );

  const isWalletWhitelisted = useMemo(() => {
    if (whitelist.entries.length === 0) {
      return true;
    }
    if (!walletAddress) {
      return false;
    }
    return whitelist.entries.includes(walletAddress);
  }, [walletAddress, whitelist.entries]);

  const interactionBlockReason = useMemo(() => {
    if (!connected) {
      return "Connect wallet to interact with SDK instructions.";
    }
    if (whitelist.invalidEntries.length > 0) {
      return "Fix invalid whitelist addresses before executing instructions.";
    }
    if (whitelist.entries.length > 0 && !isWalletWhitelisted) {
      return "Connected wallet is not in whitelist.";
    }
    return null;
  }, [connected, isWalletWhitelisted, whitelist.entries.length, whitelist.invalidEntries.length]);

  const orderedInstructions = useMemo(
    () => sortInstructionsForNavbar(instructions),
    [instructions],
  );

  useEffect(() => {
    if (orderedInstructions.length === 0) {
      setSelectedInstructionName(null);
      return;
    }

    setSelectedInstructionName((previous) => {
      if (previous && orderedInstructions.some((instruction) => instruction.name === previous)) {
        return previous;
      }
      return orderedInstructions[0].name;
    });
  }, [orderedInstructions]);

  const selectedInstruction = useMemo(
    () =>
      orderedInstructions.find((instruction) => instruction.name === selectedInstructionName) ??
      null,
    [orderedInstructions, selectedInstructionName],
  );

  const handleExecuteInstruction = useCallback(
    async (instruction: InstructionMeta, values: InstructionFormValues) => {
      try {
        await executeInstruction(instruction, values);
      } catch {
        // Error state is handled by useSendTransaction and rendered in the UI.
      }
    },
    [executeInstruction],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-card backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">
          Presales SDK Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Clean frontend to run every generated instruction from your Solana SDK,
          with wallet-aware signing, network switching, and transaction feedback.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <WalletPanel
            connected={connected}
            connecting={connecting}
            walletAddress={walletAddress}
            shortWalletAddress={shortWalletAddress}
            network={network}
            endpoint={endpoint}
            onNetworkChange={onNetworkChange}
            onOpenWalletModal={openWalletModal}
            onDisconnect={disconnectWallet}
            whitelistInput={whitelistInput}
            onWhitelistInputChange={setWhitelistInput}
            whitelistCount={whitelist.entries.length}
            invalidWhitelistEntries={whitelist.invalidEntries}
            blockReason={interactionBlockReason}
          />

          <ExecutionResultPanel
            execution={execution}
            network={network}
            onReset={resetExecution}
          />

          <AccountInspectorPanel connectedWallet={walletAddress} />
        </aside>

        <div className="min-w-0 space-y-6">
          <InstructionNavbar
            instructions={orderedInstructions}
            selectedInstructionName={selectedInstructionName}
            onSelectInstruction={setSelectedInstructionName}
          />

          {selectedInstruction?.name === "createPresale" ? (
            <CreatePresalePanel
              instruction={selectedInstruction}
              connectedWallet={walletAddress}
              disabledReason={interactionBlockReason}
              isPending={
                execution.status === "pending" &&
                execution.instructionName === selectedInstruction.displayName
              }
              onExecute={handleExecuteInstruction}
            />
          ) : selectedInstruction ? (
            <section className="panel-card space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedInstruction.displayName}
                </h2>
                <p className="text-sm text-slate-600">
                  Switch via navbar to test another SDK instruction quickly.
                </p>
              </header>

              <InstructionFormCard
                instruction={selectedInstruction}
                connectedWallet={walletAddress}
                disabledReason={interactionBlockReason}
                isPending={
                  execution.status === "pending" &&
                  execution.instructionName === selectedInstruction.displayName
                }
                onExecute={handleExecuteInstruction}
              />
            </section>
          ) : (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No instruction found in generated SDK metadata.
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
