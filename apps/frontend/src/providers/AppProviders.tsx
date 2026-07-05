import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import theme from "@/lib/theme";
import { AuthBootstrap } from "@/modules/auth/components/AuthBootstrap";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider
        theme={theme}
        toastOptions={{
          defaultOptions: {
            position: "top-left",
          },
        }}
      >
        <AuthBootstrap>{children}</AuthBootstrap>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
