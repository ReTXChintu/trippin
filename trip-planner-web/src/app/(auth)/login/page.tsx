import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { LoadingState } from "@/components/ui/LoadingState";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
