"use client";

import type { SupportedNetwork } from "@/lib/solana";
import { SOLANA_NETWORKS } from "@/lib/solana";

type WalletPanelProps = {
  connected: boolean;
  connecting: boolean;
  walletAddress: string | null;
  shortWalletAddress: string | null;
  network: SupportedNetwork;
  endpoint: string;
  onNetworkChange: (network: SupportedNetwork) => void;
  onOpenWalletModal: () => void;
  onDisconnect: () => Promise<void>;
  whitelistInput: string;
  onWhitelistInputChange: (value: string) => void;
  whitelistCount: number;
  invalidWhitelistEntries: string[];
  blockReason: string | null;
};

export function WalletPanel({
  connected,
  connecting,
  walletAddress,
  shortWalletAddress,
  network,
  endpoint,
  onNetworkChange,
  onOpenWalletModal,
  onDisconnect,
  whitelistInput,
  onWhitelistInputChange,
  whitelistCount,
  invalidWhitelistEntries,
  blockReason,
}: WalletPanelProps) {
  return (
    <section className="panel-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Wallet</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            connected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="space-y-3">
        <label className="label-base" htmlFor="network-select">
          Network
        </label>
        <select
          id="network-select"
          className="input-base"
          value={network}
          onChange={(event) =>
            onNetworkChange(event.target.value as SupportedNetwork)
          }
        >
          {SOLANA_NETWORKS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {!connected ? (
          <button
            type="button"
            className="primary-btn"
            onClick={onOpenWalletModal}
            disabled={connecting}
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              void onDisconnect();
            }}
          >
            Disconnect
          </button>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">Address</p>
          <p className="mt-1 break-all text-slate-600">
            {connected ? walletAddress : "Connect a wallet to begin"}
          </p>
          {shortWalletAddress ? (
            <p className="mt-1 text-xs text-slate-500">
              Display: {shortWalletAddress}
            </p>
          ) : null}
        </div>

        <p className="break-all text-xs text-slate-500">RPC: {endpoint}</p>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <label className="label-base" htmlFor="whitelist">
          Optional Wallet Whitelist (comma or semicolon separated)
        </label>
        <textarea
          id="whitelist"
          className="input-base min-h-24"
          placeholder="Address1, Address2; Address3"
          value={whitelistInput}
          onChange={(event) => onWhitelistInputChange(event.target.value)}
        />

        {whitelistCount > 0 ? (
          <p className="text-xs text-slate-600">
            {whitelistCount} valid whitelisted wallet
            {whitelistCount > 1 ? "s" : ""}.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            No whitelist set. Any connected wallet can interact.
          </p>
        )}

        {invalidWhitelistEntries.length > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Invalid addresses: {invalidWhitelistEntries.join(", ")}
          </p>
        ) : null}

        {blockReason ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {blockReason}
          </p>
        ) : null}
      </div>
    </section>
  );
}
