import { AccountEntry } from "../onboarding-flow";

export const metadata = {
  title: "Create account — Preflight",
  description: "Create a Preflight deployment workspace.",
};

export default function CreateAccountPage() {
  return <AccountEntry initialMode="register" />;
}
