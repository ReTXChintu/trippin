import { Box, Button, Collapse, Flex, Icon, Text, useDisclosure } from "@chakra-ui/react";
import { Fragment } from "react";
import { LuArrowRight, LuCheck, LuChevronDown, LuChevronRight, LuTriangleAlert } from "react-icons/lu";
import type { NextStep, StageSummary, TripStage } from "@/modules/trips/utils/trip-stage";

function StageIcon({ status }: { status: TripStage["status"] }) {
  const common = { w: "24px", h: "24px", borderRadius: "full", flexShrink: 0, align: "center", justify: "center" } as const;
  if (status === "done") {
    return (
      <Flex {...common} bg="ac" color="acTx">
        <Icon as={LuCheck} boxSize="14px" strokeWidth={2.5} />
      </Flex>
    );
  }
  if (status === "warn") {
    return (
      <Flex {...common} bg="warnSoft" color="warn" borderWidth="1.5px" borderColor="warnFill">
        <Icon as={LuTriangleAlert} boxSize="13px" />
      </Flex>
    );
  }
  if (status === "current") {
    return (
      <Flex {...common} borderWidth="2px" borderColor="ac" bg="sf">
        <Box w="10px" h="10px" borderRadius="full" bg="ac" />
      </Flex>
    );
  }
  return <Box {...common} display="inline-block" borderWidth="1.5px" borderStyle="dashed" borderColor="ln2" />;
}

interface StageBarProps {
  summary: StageSummary;
  onStage: (stage: TripStage) => void;
  onNext: (next: NextStep) => void;
}

/** One quiet line: progress, the suggested next step and its button. The seven stages (each a link to
 * its tab) open from "Steps". Desktop only (phones get the banner). */
export function StageBar({ summary, onStage, onNext }: StageBarProps) {
  const { stages, next, doneCount } = summary;
  const steps = useDisclosure();
  return (
    <Box py={2} borderTopWidth="1px" borderColor="ln">
      <Flex align="center" gap={3} flexWrap="wrap">
        <Flex gap={1} aria-hidden>
          {stages.map((s) => (
            <Box key={s.key} w="18px" h="4px" borderRadius="2px" bg={s.status === "done" ? "ac" : s.status === "warn" ? "warnFill" : "sunk"} />
          ))}
        </Flex>
        <Text fontSize="13px" color="tx3" whiteSpace="nowrap" className="num">
          {doneCount} of {stages.length} done
        </Text>
        {next && (
          <>
            <Text fontSize="13px" fontWeight={600} noOfLines={1} minW={0} flex="0 1 auto">
              Next: {next.text}
            </Text>
            <Button size="xs" px={3} rightIcon={<LuArrowRight />} onClick={() => onNext(next)} flexShrink={0}>
              {next.actionLabel}
            </Button>
          </>
        )}
        <Button
          size="xs"
          variant="ghost"
          colorScheme="gray"
          ml="auto"
          rightIcon={<LuChevronDown style={{ transform: steps.isOpen ? "rotate(180deg)" : undefined }} />}
          onClick={steps.onToggle}
          aria-expanded={steps.isOpen}
        >
          Steps
        </Button>
      </Flex>
      <Collapse in={steps.isOpen} animateOpacity unmountOnExit>
        <Flex as="nav" aria-label="Trip progress" align="center" flexWrap="wrap" rowGap={1} minW={0} pt={2}>
          {stages.map((stage, i) => (
            <Fragment key={stage.key}>
              {i > 0 && <Box w="18px" h="1px" mx="2px" flexShrink={0} bg={stages[i - 1].status === "done" ? "ac" : "ln2"} />}
              <Flex
                as="button"
                type="button"
                onClick={() => onStage(stage)}
                align="center"
                gap={2}
                px="6px"
                py="4px"
                borderRadius="md"
                textAlign="left"
                _hover={{ bg: "sunk" }}
                _focusVisible={{ outline: "3px solid", outlineColor: "ac", outlineOffset: "1px" }}
                aria-label={`${stage.label}: ${stage.detail}`}
              >
                <StageIcon status={stage.status} />
                <Flex direction="column" lineHeight={1.3}>
                  <Text fontWeight={600} fontSize="13px" whiteSpace="nowrap">
                    {stage.label}
                  </Text>
                  <Text fontSize="12px" whiteSpace="nowrap" color={stage.status === "warn" ? "warn" : "tx3"}>
                    {stage.detail}
                  </Text>
                </Flex>
              </Flex>
            </Fragment>
          ))}
        </Flex>
      </Collapse>
    </Box>
  );
}

/** Phone version: "STEP 5 OF 7  Next: add a stay for Udaipur  ›". */
export function StageBanner({ summary, onNext }: { summary: StageSummary; onNext: (next: NextStep) => void }) {
  const { next, stages, doneCount } = summary;
  if (!next) return null;
  const step = Math.min(doneCount + 1, stages.length);
  return (
    <Flex
      as="button"
      type="button"
      onClick={() => onNext(next)}
      align="center"
      gap={2}
      mx={4}
      mt="6px"
      mb={2}
      px="14px"
      py={2}
      minH="48px"
      bg="warnSoft"
      color="warn"
      borderRadius="lg"
      textAlign="left"
      w="calc(100% - 32px)"
    >
      <Text fontSize="12px" fontWeight={600} letterSpacing="0.02em" flexShrink={0} className="num">
        Step {step} of {stages.length}
      </Text>
      <Text fontWeight={600} fontSize="14px" flex={1} minW={0} noOfLines={1}>
        Next: {next.text.charAt(0).toLowerCase() + next.text.slice(1)}
      </Text>
      <Icon as={LuChevronRight} boxSize="16px" />
    </Flex>
  );
}
