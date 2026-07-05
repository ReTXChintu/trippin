import { Suspense } from "react";
import { Center } from "@chakra-ui/react";
import { AuthPageWrapper } from "@/components/layout/AuthPageWrapper";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <Center minH="100vh">
          <LoadingState />
        </Center>
      }
    >
      <AuthPageWrapper>{children}</AuthPageWrapper>
    </Suspense>
  );
}
