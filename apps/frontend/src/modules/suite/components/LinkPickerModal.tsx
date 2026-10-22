import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuArrowUpDown, LuCirclePlus, LuCircleDot, LuCircle } from "react-icons/lu";
import { Banner, Pill } from "@/components/ui";
import type { SuiteApp, SuiteCandidate } from "@/modules/suite/types/suite.types";
import { candidateCounts, candidateDates, candidateImpact } from "@/modules/suite/utils/link-candidates";

function Option({
  selected,
  onSelect,
  title,
  lines,
  pills,
  isNew,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  lines: string[];
  pills?: React.ReactNode;
  isNew?: boolean;
}) {
  return (
    <Flex
      as="button"
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      textAlign="left"
      gap={3}
      p={3}
      borderRadius="lg"
      borderWidth={selected ? "1.5px" : "1px"}
      borderColor={selected ? "ac" : "ln"}
      bg={selected ? "acSoft" : "sf"}
      _hover={{ borderColor: selected ? "ac" : "ln2" }}
      _focusVisible={{ boxShadow: "outline" }}
    >
      <Icon as={selected ? LuCircleDot : isNew ? LuCirclePlus : LuCircle} boxSize="20px" color={selected ? "ac" : "tx3"} mt="1px" flexShrink={0} />
      <Box minW={0}>
        <Text fontWeight={600} fontSize="15px" lineHeight="20px">
          {title}
        </Text>
        {lines.map((line) => (
          <Text key={line} fontSize="13px" lineHeight="18px" color="tx2" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {line}
          </Text>
        ))}
        {pills && (
          <HStack spacing={1.5} mt={1.5} flexWrap="wrap">
            {pills}
          </HStack>
        )}
      </Box>
    </Flex>
  );
}

/**
 * "Link to SpendLog": the owner's existing groups (or InFrame events) this trip could use instead of
 * a new one, each with what linking it changes, and "Create a new …". `onChoose(null)` = new one.
 */
export function LinkPickerModal({
  isOpen,
  onClose,
  onChoose,
  app,
  appName,
  candidates,
  couldNotCheck,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (attachTo: string | null) => void;
  app: SuiteApp;
  appName: string;
  candidates: SuiteCandidate[];
  couldNotCheck: boolean;
  isLoading: boolean;
}) {
  const thing = app === "spendlog" ? "group" : "event";
  const preselected = candidates.find((c) => c.linkedHere)?.id ?? "";
  const [choice, setChoice] = useState(preselected);
  useEffect(() => setChoice(preselected), [preselected, isOpen]);
  const chosen = candidates.find((c) => c.id === choice);
  const impact = chosen ? candidateImpact(chosen.impact) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Link to {appName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            <Text fontSize="14px" lineHeight="20px" color="tx2">
              {candidates.length === 0
                ? `This trip gets a new ${appName} ${thing}.`
                : `Use one of your ${appName} ${thing}s for this trip, or start a new one. A ${thing} you pick takes this trip’s name and dates.`}
            </Text>
            {couldNotCheck && (
              <Banner tone="warn">
                Couldn’t check {appName} for your existing {thing}s, so only a new one can be made right now.
              </Banner>
            )}
            <Stack spacing={2} role="radiogroup" aria-label={`Which ${appName} ${thing}`}>
              {candidates.map((c) => (
                <Option
                  key={c.id}
                  selected={choice === c.id}
                  onSelect={() => setChoice(c.id)}
                  title={c.name}
                  lines={[candidateDates(c), candidateCounts(app, c.counts)].filter((x): x is string => !!x)}
                  pills={
                    (c.linkedHere || c.archived) && (
                      <>
                        {c.linkedHere && <Pill tone="accent">Linked to this trip before</Pill>}
                        {c.archived && <Pill>Archived</Pill>}
                      </>
                    )
                  }
                />
              ))}
              <Option
                selected={choice === ""}
                onSelect={() => setChoice("")}
                title={`Create a new ${thing}`}
                lines={["Named and dated like this trip, with everyone on it."]}
                isNew
              />
            </Stack>
            {impact && (
              <Banner tone={(chosen?.impact?.leaving ?? 0) > 0 ? "warn" : "accent"} icon={LuArrowUpDown}>
                {impact}
              </Banner>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onChoose(choice || null)} isLoading={isLoading}>
            {choice ? `Link this ${thing}` : "Create and link"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
