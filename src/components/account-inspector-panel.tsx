"use client";

import { useState } from "react";

import { useAccountInspector } from "@/hooks/useAccountInspector";

type AccountInspectorPanelProps = {
  connectedWallet: string | null;
};

export function AccountInspectorPanel({
  connectedWallet,
}: AccountInspectorPanelProps) {
  const { state, inspect, reset } = useAccountInspector();
  const [accountAddress, setAccountAddress] = useState("");

  return (
    <section className="panel-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Account Inspector</h2>
        {state.status !== "idle" ? (
          <button
            type="button"
            className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
            onClick={() => {
              reset();
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void inspect(accountAddress);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="account-inspector-address" className="label-base">
            Program Account Address
          </label>
          <input
            id="account-inspector-address"
            className="input-base"
            placeholder="Enter BuyerDetails / PresaleDetails / PresaleIndex / PriceUpdateV2 account"
            value={accountAddress}
            onChange={(event) => setAccountAddress(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className="primary-btn sm:w-auto" disabled={state.status === "loading"}>
            {state.status === "loading" ? "Inspecting..." : "Inspect Account"}
          </button>

          {connectedWallet ? (
            <button
              type="button"
              className="secondary-btn sm:w-auto"
              onClick={() => setAccountAddress(connectedWallet)}
            >
              Use Connected Wallet
            </button>
          ) : null}
        </div>
      </form>

      {state.status === "error" && state.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.status === "success" && state.result ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
            <p>
              <span className="font-semibold">Type:</span> {state.result.accountType}
            </p>
            <p>
              <span className="font-semibold">Lamports:</span> {state.result.lamports}
            </p>
            <p>
              <span className="font-semibold">Owner:</span> {state.result.owner}
            </p>
            <p>
              <span className="font-semibold">Data bytes:</span> {state.result.dataLength}
            </p>
            <p>
              <span className="font-semibold">Executable:</span>{" "}
              {state.result.executable ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-semibold">Rent epoch:</span> {state.result.rentEpoch}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decoded Data
            </p>
            <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
              {JSON.stringify(state.result.decodedData, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
