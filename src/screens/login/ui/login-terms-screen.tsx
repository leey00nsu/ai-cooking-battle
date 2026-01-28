import TermsForm from "@/features/auth-consent/ui/terms-form";
import AuthShell from "@/widgets/auth-shell/ui/auth-shell";

type LoginTermsScreenProps = {
  userName?: string | null;
};

export default function LoginTermsScreen({ userName }: LoginTermsScreenProps) {
  return (
    <AuthShell>
      <div className="w-full max-w-[520px]">
        <TermsForm userName={userName} />
      </div>
    </AuthShell>
  );
}
