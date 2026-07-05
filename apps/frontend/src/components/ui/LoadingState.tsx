import { Center, Spinner, Text, VStack } from "@chakra-ui/react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <Center py={20}>
      <VStack spacing={4}>
        <Spinner size="xl" color="brand.500" thickness="3px" />
        <Text color="gray.500">{message}</Text>
      </VStack>
    </Center>
  );
}
