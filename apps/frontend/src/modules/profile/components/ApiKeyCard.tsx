import { Box, Button, Flex, HStack, Icon, Link, Text, useToast } from "@chakra-ui/react";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { FiCheck, FiLock, FiShield } from "react-icons/fi";
import { LuKeyRound } from "react-icons/lu";
import { Pill, SurfaceCard } from "@/components/ui";
import { IconInput, SecretInput } from "@/components/ui/app";
import { getApiErrorMessage } from "@/lib/api";
import { useUpdateApiKeys } from "@/modules/profile/hooks/useProfile";

type KeyField = "openaiApiKey" | "geminiApiKey" | "googleMapsApiKey";
type ClearField = "clearOpenai" | "clearGemini" | "clearGoogleMaps";

/** One provider key: status, the masked key with Replace / Remove, or a field to paste one. */
export function ApiKeyCard({
  name,
  description,
  field,
  clearField,
  hasKey,
  last4,
  serverKey,
  placeholder,
  link,
  extraNote,
  guideTo,
}: {
  name: string;
  description: string;
  field: KeyField;
  clearField: ClearField;
  hasKey: boolean;
  last4?: string;
  /** The server provides a shared key for this when the user has none. */
  serverKey?: boolean;
  placeholder: string;
  link: { href: string; label: string };
  extraNote?: string;
  /** In-app setup guide, shown instead of the external link. */
  guideTo?: string;
}) {
  const toast = useToast();
  const update = useUpdateApiKeys();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputId = `key-${field}`;
  const showInput = !hasKey || editing;

  const save = async () => {
    const key = value.trim();
    if (!key) {
      toast({ title: `Paste your ${name} key first`, status: "warning", duration: 3000 });
      return;
    }
    try {
      await update.mutateAsync({ [field]: key });
      setValue("");
      setEditing(false);
      toast({ title: `${name} key saved`, status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  const remove = async () => {
    try {
      await update.mutateAsync({ [clearField]: true });
      setEditing(false);
      toast({ title: `${name} key removed`, status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  return (
    <SurfaceCard as="section" aria-labelledby={`${inputId}-title`} p={5} display="flex" flexDirection="column" gap={4}>
      <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
        <HStack spacing={3} align="center" minW={0}>
          <Flex w="40px" h="40px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center" flexShrink={0}>
            <Icon as={LuKeyRound} boxSize="20px" />
          </Flex>
          <Box minW={0}>
            <Text as="h3" id={`${inputId}-title`} fontWeight={600} fontSize="15px" lineHeight="20px">
              {name}
            </Text>
            <Text fontSize="13px" lineHeight="18px" color="tx3">
              {description}
            </Text>
          </Box>
        </HStack>
        {hasKey ? (
          <Pill tone="success" icon={FiCheck}>
            Configured · ends {last4 ?? "····"}
          </Pill>
        ) : serverKey ? (
          <Pill tone="accent" icon={FiShield}>
            Using shared server key
          </Pill>
        ) : (
          <Pill>Not set</Pill>
        )}
      </Flex>

      {showInput ? (
        <Flex
          as="form"
          gap={2}
          direction={{ base: "column", sm: "row" }}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            void save();
          }}
        >
          <Box flex={1}>
            <SecretInput
              id={inputId}
              icon={LuKeyRound}
              noun="key"
              autoComplete="off"
              spellCheck={false}
              placeholder={hasKey ? "Paste the new key" : placeholder}
              aria-label={`${name} key`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus={editing}
            />
          </Box>
          <HStack spacing={2}>
            <Button type="submit" h="44px" isLoading={update.isPending} flex={{ base: 1, sm: "none" }}>
              Save key
            </Button>
            {editing && (
              <Button
                variant="ghost"
                h="44px"
                onClick={() => {
                  setEditing(false);
                  setValue("");
                }}
              >
                Cancel
              </Button>
            )}
          </HStack>
        </Flex>
      ) : (
        <Flex gap={2} direction={{ base: "column", sm: "row" }}>
          <Box flex={1}>
            {/* Only the last four characters ever come back from the server, so there is nothing to reveal here. */}
            <IconInput icon={FiLock} isReadOnly value={`••••••••••••${last4 ?? ""}`} aria-label={`${name} key, ends ${last4 ?? ""}`} />
          </Box>
          <HStack spacing={2}>
            <Button variant="outline" h="44px" onClick={() => setEditing(true)} flex={{ base: 1, sm: "none" }}>
              Replace
            </Button>
            <Button variant="danger" h="44px" onClick={remove} isLoading={update.isPending} flex={{ base: 1, sm: "none" }}>
              Remove
            </Button>
          </HStack>
        </Flex>
      )}

      <Text fontSize="12px" lineHeight="16px" color="tx3">
        Stored encrypted.{extraNote ? ` ${extraNote}` : ""}{" "}
        {guideTo ? (
          <Link as={RouterLink} to={guideTo}>
            {link.label}
          </Link>
        ) : (
          <Link href={link.href} isExternal>
            {link.label}
          </Link>
        )}
      </Text>
    </SurfaceCard>
  );
}
