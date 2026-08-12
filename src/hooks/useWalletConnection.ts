"use client";

import { useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { useNetwork } from "@/components/providers/network-provider";
import { shortenAddress, type SupportedNetwork } from "@/lib/solana";

export function useWalletConnection() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
  } = useWallet();
  const { setVisible } = useWalletModal();
  const { network, endpoint, setNetwork } = useNetwork();

  const walletAddress = publicKey?.toBase58() ?? null;

  const shortWalletAddress = useMemo(
    () => (walletAddress ? shortenAddress(walletAddress, 5) : null),
    [walletAddress],
  );

  const openWalletModal = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const disconnectWallet = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const onNetworkChange = useCallback(
    (nextNetwork: SupportedNetwork) => {
      setNetwork(nextNetwork);
    },
    [setNetwork],
  );

  return {
    connected,
    connecting,
    endpoint,
    network,
    onNetworkChange,
    openWalletModal,
    disconnectWallet,
    walletAddress,
    shortWalletAddress,
  };
}
