"use client";

import type { ReactNode } from "react";

import { NetworkProvider } from "@/components/providers/network-provider";
import { AppWalletProvider } from "@/components/providers/wallet-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <AppWalletProvider>{children}</AppWalletProvider>
    </NetworkProvider>
  );
}
