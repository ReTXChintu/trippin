import { Box, Flex, Heading, Icon, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { IconType } from "react-icons";
import { FiBarChart2, FiUser } from "react-icons/fi";
import { LuKeyRound, LuSparkles } from "react-icons/lu";
import { ProfileForm } from "@/modules/profile/components/ProfileForm";

const SECTIONS: { id: string; label: string; sub: string; icon: IconType }[] = [
  { id: "profile", label: "Profile", sub: "Name and photo", icon: FiUser },
  { id: "api-keys", label: "API keys", sub: "OpenAI, Gemini, Google Maps", icon: LuKeyRound },
  { id: "google-usage", label: "Google usage", sub: "This month’s calls", icon: FiBarChart2 },
  { id: "ai-settings", label: "AI settings", sub: "Provider and model", icon: LuSparkles },
];

export function ProfilePage() {
  const [active, setActive] = useState("profile");

  return (
    <Flex gap={8} align="flex-start">
      <Stack
        as="nav"
        aria-label="Profile sections"
        spacing={1}
        flex="0 0 260px"
        position="sticky"
        top="96px"
        display={{ base: "none", lg: "flex" }}
        bg="sf"
        borderWidth="1px"
        borderColor="ln"
        borderRadius="xl"
        p={2}
      >
        {SECTIONS.map((s) => {
          const on = active === s.id;
          return (
            <Flex
              key={s.id}
              as="a"
              href={`#${s.id}`}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                setActive(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              aria-current={on ? "location" : undefined}
              align="center"
              gap={3}
              minH="48px"
              px="10px"
              py="6px"
              borderRadius="md"
              bg={on ? "acSoft" : "transparent"}
              color={on ? "ac" : "tx"}
              _hover={on ? undefined : { bg: "sunk" }}
            >
              <Icon as={s.icon} boxSize="20px" color={on ? "ac" : "tx2"} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="14px" lineHeight="20px" fontWeight={on ? 600 : 500}>
                  {s.label}
                </Text>
                <Text fontSize="12px" lineHeight="16px" color="tx3" noOfLines={1}>
                  {s.sub}
                </Text>
              </Box>
            </Flex>
          );
        })}
      </Stack>
      <Box flex={1} minW={0}>
        <Heading as="h1" fontSize="22px" lineHeight="28px" mb={5}>
          Profile
        </Heading>
        <ProfileForm />
      </Box>
    </Flex>
  );
}
