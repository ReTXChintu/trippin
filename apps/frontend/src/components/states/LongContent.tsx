import { Flex, type FlexProps, Text, type TextProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

/** Single-line text that ends in "…" when too long; the full string shows as a tooltip (title). */
export function TruncatedText({ children, ...rest }: { children: string } & TextProps) {
  return (
    <Text overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" minW={0} title={children} {...rest}>
      {children}
    </Text>
  );
}

/** A row of chips/pills that scrolls sideways on its own (no page scroll), e.g. 20 day pills. */
export function ScrollRow({ children, label, ...rest }: { children: ReactNode; label?: string } & FlexProps) {
  return (
    <Flex
      role={label ? "group" : undefined}
      aria-label={label}
      gap="6px"
      overflowX="auto"
      maxW="100%"
      pb="2px"
      sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" }, "& > *": { flexShrink: 0 } }}
      {...rest}
    >
      {children}
    </Flex>
  );
}
