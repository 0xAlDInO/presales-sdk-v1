"use client";

import { getExplorerTransactionUrl, type SupportedNetwork } from "@/lib/solana";
import type { TransactionExecutionState } from "@/hooks/useSendTransaction";

type ExecutionResultPanelProps = {
  execution: TransactionExecutionState;
  network: SupportedNetwork;
  onReset: () => void;
};

export function ExecutionResultPanel({
  execution,
  network,
  onReset,
}: ExecutionResultPanelProps) {
  const explorerLink = execution.signature
    ? getExplorerTransactionUrl(execution.signature, network)
    : null;

  return (
    <section className="panel-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Execution Result</h2>
        {execution.status !== "idle" ? (
          <button
            type="button"
            className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
            onClick={onReset}
          >
            Clear
          </button>
        ) : null}
      </div>

      {execution.status === "idle" ? (
        <p className="text-sm text-slate-600">
          Run any instruction to see transaction status and signature details.
        </p>
      ) : null}

      {execution.status === "pending" ? (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
          <p className="text-sm font-medium text-brand-700">Pending confirmation</p>
          <p className="mt-1 text-sm text-brand-600">
            Sending {execution.instructionName ?? "instruction"}...
          </p>
        </div>
      ) : null}

      {execution.status === "success" ? (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-700">
            Transaction confirmed
          </p>
          {execution.signature ? (
            <p className="break-all text-xs text-emerald-700">
              Signature: {execution.signature}
            </p>
          ) : null}
          {explorerLink ? (
            <a
              className="inline-flex text-xs font-medium text-emerald-700 underline"
              href={explorerLink}
              target="_blank"
              rel="noreferrer"
            >
              Open in Solana Explorer
            </a>
          ) : null}

          {execution.diagnostics ? (
            <div className="space-y-1 border-t border-emerald-200 pt-2 text-xs text-emerald-800">
              <p>
                Slot: {execution.diagnostics.slot}
                {execution.diagnostics.blockTimeIso
                  ? ` • ${new Date(execution.diagnostics.blockTimeIso).toLocaleString()}`
                  : ""}
              </p>
              {execution.diagnostics.feeLamports ? (
                <p>Fee: {execution.diagnostics.feeLamports} lamports</p>
              ) : null}
              {execution.diagnostics.computeUnitsConsumed !== null ? (
                <p>
                  Compute units consumed:{" "}
                  {execution.diagnostics.computeUnitsConsumed}
                </p>
              ) : null}
              {execution.diagnostics.instructionTrace.length > 0 ? (
                <div>
                  <p className="font-semibold">Instruction trace:</p>
                  <ul className="list-disc pl-5">
                    {execution.diagnostics.instructionTrace.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {execution.status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-700">Transaction failed</p>
          <p className="mt-1 break-words text-sm text-rose-700">{execution.error}</p>
          {execution.signature ? (
            <p className="mt-2 break-all text-xs text-rose-700">
              Signature: {execution.signature}
            </p>
          ) : null}
          {execution.signature && explorerLink ? (
            <a
              className="mt-1 inline-flex text-xs font-medium text-rose-700 underline"
              href={explorerLink}
              target="_blank"
              rel="noreferrer"
            >
              Open in Solana Explorer
            </a>
          ) : null}
          {execution.customErrorHex ? (
            <p className="mt-2 text-xs text-rose-800">
              Program error code: {execution.customErrorHex}
            </p>
          ) : null}
          {execution.customErrorMessage ? (
            <p className="mt-1 text-xs text-rose-800">
              {execution.customErrorMessage}
            </p>
          ) : null}
          {execution.logs.length > 0 ? (
            <details className="mt-2 rounded-md border border-rose-200 bg-white/70 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-rose-700">
                View transaction logs
              </summary>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[11px] text-rose-800">
                {execution.logs.join("\n")}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
