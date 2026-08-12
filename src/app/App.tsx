import { Dashboard } from "@/components/dashboard";
import type { InstructionMeta } from "@/types/instruction";

type AppProps = {
  instructions: InstructionMeta[];
};

export function App({ instructions }: AppProps) {
  return <Dashboard instructions={instructions} />;
}
