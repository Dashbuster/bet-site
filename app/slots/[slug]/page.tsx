import { notFound } from "next/navigation";
import { SlotMachine } from "@/components/slot-machine";
import { slotGames } from "@/data/slots";

export function generateStaticParams() {
  return slotGames.map((game) => ({ slug: game.id }));
}

export default async function SlotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = slotGames.find((entry) => entry.id === slug);

  if (!game) {
    notFound();
  }

  return <SlotMachine game={game} />;
}
