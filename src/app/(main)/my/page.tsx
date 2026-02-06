import { requireAuth } from "@/lib/auth-guards";
import MyKitchenScreen from "@/screens/my-kitchen/ui/my-kitchen-screen";

export default async function MyKitchenPage() {
  await requireAuth("/my");
  return <MyKitchenScreen />;
}
