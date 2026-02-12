import { redirect } from "next/navigation";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export default function RankingEntryPage() {
  redirect(`/ranking/${formatDayKeyForKST()}`);
}
