import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginTermsScreen from "@/screens/login/ui/login-terms-screen";

export default async function LoginTermsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name ?? null;

  return <LoginTermsScreen userName={userName} />;
}
