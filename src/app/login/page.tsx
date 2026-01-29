import { enabledProviders } from "@/lib/auth";
import LoginScreen from "@/screens/login/ui/login-screen";

export default function LoginPage() {
  return <LoginScreen enabledProviders={enabledProviders} />;
}
