import { Outlet } from "react-router-dom";
import { AuthPageWrapper } from "@/components/layout/AuthPageWrapper";

export function AuthLayout() {
  return (
    <AuthPageWrapper>
      <Outlet />
    </AuthPageWrapper>
  );
}
