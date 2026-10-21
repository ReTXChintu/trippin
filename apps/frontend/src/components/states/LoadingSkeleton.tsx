import { Box, type BoxProps, Flex, Stack } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`;

/** One shimmering placeholder bar/box (design `.sk`). Size it with w/h like any Box. */
export function SkeletonBlock(props: BoxProps) {
  return (
    <Box
      aria-hidden
      borderRadius="8px"
      bgGradient="linear(90deg, bg.subtle, border.line, bg.subtle)"
      bgSize="200% 100%"
      animation={`${shimmer} 1.4s ease-in-out infinite`}
      sx={{ "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}
      {...props}
    />
  );
}

// Widths vary per row so a list skeleton doesn't look like a barcode.
const WIDTHS: [string, string][] = [
  ["70%", "45%"],
  ["55%", "60%"],
  ["80%", "40%"],
  ["60%", "50%"],
];

function ListRows({ rows }: { rows: number }) {
  return (
    <Stack spacing="10px">
      {Array.from({ length: rows }, (_, i) => {
        const [a, b] = WIDTHS[i % WIDTHS.length];
        return (
          <Flex key={i} gap="10px" align="center">
            <SkeletonBlock w="44px" h="44px" flexShrink={0} />
            <Stack flex={1} spacing="6px">
              <SkeletonBlock h="14px" w={a} />
              <SkeletonBlock h="12px" w={b} />
            </Stack>
          </Flex>
        );
      })}
    </Stack>
  );
}

function DayCardSkeleton() {
  return (
    <Box bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" p={4}>
      <Flex gap={3} align="center" mb={4}>
        <SkeletonBlock w="44px" h="44px" borderRadius="10px" flexShrink={0} />
        <Stack flex={1} spacing="6px">
          <SkeletonBlock h="16px" w="40%" />
          <SkeletonBlock h="12px" w="60%" />
        </Stack>
      </Flex>
      <ListRows rows={3} />
    </Box>
  );
}

export type LoadingSkeletonVariant = "list" | "dayCard" | "map" | "page";

/**
 * Loading placeholder shaped like what's coming: `list` (rows of thumb + two lines), `dayCard`
 * (a plan day card), `map` (a map panel) or `page` (title + day cards). `count` repeats rows/cards.
 */
export function LoadingSkeleton({
  variant = "list",
  count,
  label = "Loading",
  ...rest
}: { variant?: LoadingSkeletonVariant; count?: number; label?: string } & BoxProps) {
  let body;
  if (variant === "map") {
    body = <SkeletonBlock h="100%" minH="280px" borderRadius="xl" />;
  } else if (variant === "dayCard") {
    body = (
      <Stack spacing={3}>
        {Array.from({ length: count ?? 1 }, (_, i) => (
          <DayCardSkeleton key={i} />
        ))}
      </Stack>
    );
  } else if (variant === "page") {
    body = (
      <Stack spacing={5}>
        <Stack spacing={2}>
          <SkeletonBlock h="12px" w="160px" />
          <SkeletonBlock h="32px" w="min(360px, 80%)" />
        </Stack>
        <Stack spacing={3}>
          {Array.from({ length: count ?? 2 }, (_, i) => (
            <DayCardSkeleton key={i} />
          ))}
        </Stack>
      </Stack>
    );
  } else {
    body = <ListRows rows={count ?? 4} />;
  }
  return (
    <Box role="status" aria-busy="true" aria-label={label} {...rest}>
      {body}
    </Box>
  );
}
