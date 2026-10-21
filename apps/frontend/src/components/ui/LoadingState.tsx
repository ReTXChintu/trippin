import { Center, Spinner, Text, VStack } from "@chakra-ui/react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <Center py={20}>
      <VStack spacing={4}>
        <Spinner w="28px" h="28px" color="ac" emptyColor="sunk" thickness="3px" speed="0.9s" />
        <Text color="tx3">{message}</Text>
      </VStack>
    </Center>
  );
}
