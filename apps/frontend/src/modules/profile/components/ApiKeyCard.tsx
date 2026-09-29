import { Box, Button, Flex, HStack, Icon, Link, Text, useToast } from "@chakra-ui/react";
import { useState } from "react";
import { FiCheck, FiLock, FiShield } from "react-icons/fi";
import { LuKeyRound } from "react-icons/lu";
import { Pill, SurfaceCard } from "@/components/ui";
import { IconInput } from "@/components/ui/app";
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
    <SurfaceCard as="section" aria-labelledby={`${inputId}-title`} p="18px" display="flex" flexDirection="column" gap="10px">
      <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} gap="10px" direction={{ base: "column", sm: "row" }}>
        <HStack spacing="10px" align="center">
          <Flex w="36px" h="36px" borderRadius="10px" bg="accent.soft" color="accent.text" align="center" justify="center" flexShrink={0}>
            <Icon as={LuKeyRound} boxSize="18px" />
          </Flex>
          <Box>
            <Text as="h3" id={`${inputId}-title`} fontWeight={600}>
              {name}
            </Text>
            <Text fontSize="12px" color="fg.muted">
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
          gap="8px"
          direction={{ base: "column", sm: "row" }}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            void save();
          }}
        >
          <Box flex={1}>
            <IconInput
              id={inputId}
              icon={LuKeyRound}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={hasKey ? "Paste the new key" : placeholder}
              aria-label={`${name} key`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus={editing}
            />
          </Box>
          <HStack spacing="8px">
            <Button type="submit" isLoading={update.isPending} flex={{ base: 1, sm: "none" }}>
              Save key
            </Button>
            {editing && (
              <Button
                variant="ghost"
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
        <Flex gap="8px" direction={{ base: "column", sm: "row" }}>
          <Box flex={1}>
            <IconInput icon={FiLock} isReadOnly value={`••••••••••••${last4 ?? ""}`} aria-label={`${name} key, ends ${last4 ?? ""}`} />
          </Box>
          <HStack spacing="8px">
            <Button variant="outline" onClick={() => setEditing(true)} flex={{ base: 1, sm: "none" }}>
              Replace
            </Button>
            <Button variant="danger" onClick={remove} isLoading={update.isPending} flex={{ base: 1, sm: "none" }}>
              Remove
            </Button>
          </HStack>
        </Flex>
      )}

      <Text fontSize="12px" color="fg.muted">
        Stored encrypted.{extraNote ? ` ${extraNote}` : ""}{" "}
        <Link href={link.href} isExternal color="accent.text" fontWeight={600} textDecoration="underline">
          {link.label}
        </Link>
      </Text>
    </SurfaceCard>
  );
}
