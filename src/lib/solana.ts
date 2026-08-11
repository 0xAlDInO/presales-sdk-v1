import { clusterApiUrl, PublicKey } from "@solana/web3.js";

export type SupportedNetwork = "devnet" | "mainnet-beta";

export const SOLANA_NETWORKS: Array<{ label: string; value: SupportedNetwork }> = [
  { label: "Devnet", value: "devnet" },
  { label: "Mainnet", value: "mainnet-beta" },
];

export function getRpcEndpoint(network: SupportedNetwork): string {
  return clusterApiUrl(network);
}

export function getExplorerTransactionUrl(
  signature: string,
  network: SupportedNetwork,
): string {
  const clusterParam = network === "mainnet-beta" ? "mainnet-beta" : "devnet";
  return `https://explorer.solana.com/tx/${signature}?cluster=${clusterParam}`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2) {
    return address;
  }
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
