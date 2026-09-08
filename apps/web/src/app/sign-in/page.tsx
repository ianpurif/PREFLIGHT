import { AccountEntry } from "../onboarding-flow";

export const metadata = {
  title: "Sign in — Preflight",
  description: "Sign in to your Preflight deployment workspace.",
};

export default function SignInPage() {
  return <AccountEntry initialMode="sign-in" />;
}
