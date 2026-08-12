import { App } from "@/app/App";
import { getInstructionMetadata } from "@/lib/instruction-metadata";

export default async function HomePage() {
  const instructions = await getInstructionMetadata();
  return <App instructions={instructions} />;
}
