import { requireAuth } from "@/lib/auth-guards";
import CreateScreen from "@/screens/create/ui/create-screen";

export default async function CreatePage() {
  await requireAuth("/create");
  return <CreateScreen />;
}
