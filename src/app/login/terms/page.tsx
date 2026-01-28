import { requireAuth } from "@/lib/auth-guards";
import LoginTermsScreen from "@/screens/login/ui/login-terms-screen";

export default async function LoginTermsPage() {
  const session = await requireAuth("/login/terms");

  const userName = session.user.name ?? null;

  return <LoginTermsScreen userName={userName} />;
}
