"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getRpcEndpoint, type SupportedNetwork } from "@/lib/solana";

const STORAGE_KEY = "presales_sdk_network";

type NetworkContextValue = {
  network: SupportedNetwork;
  endpoint: string;
  setNetwork: (network: SupportedNetwork) => void;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<SupportedNetwork>("devnet");

  useEffect(() => {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (storedValue === "devnet" || storedValue === "mainnet-beta") {
      setNetworkState(storedValue);
    }
  }, []);

  const setNetwork = useCallback((nextNetwork: SupportedNetwork) => {
    setNetworkState(nextNetwork);
    localStorage.setItem(STORAGE_KEY, nextNetwork);
  }, []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      network,
      endpoint: getRpcEndpoint(network),
      setNetwork,
    }),
    [network, setNetwork],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider.");
  }
  return context;
}
