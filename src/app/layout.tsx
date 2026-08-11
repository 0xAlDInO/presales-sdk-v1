import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";

import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "Presales SDK Dashboard",
  description: "UI to interact with generated Solana SDK instructions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
