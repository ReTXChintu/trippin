"use client";

import { Flex, Heading, useColorModeValue } from "@chakra-ui/react";

export function ShareHeader() {
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Flex
      as="header"
      align="center"
      justify="center"
      h="16"
      bg={bg}
      borderBottomWidth="1px"
      borderColor={borderColor}
    >
      <Heading size="md">TripPlanner</Heading>
    </Flex>
  );
}
