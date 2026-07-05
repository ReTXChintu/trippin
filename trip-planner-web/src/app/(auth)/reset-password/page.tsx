import { ResetPasswordForm } from "@/modules/auth/components/ResetPasswordForm";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ResetPasswordForm token="" />
    );
  }

  return <ResetPasswordForm token={token} />;
}
