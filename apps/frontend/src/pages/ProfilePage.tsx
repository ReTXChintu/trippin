import { Box, Flex, Heading, Icon, Stack } from "@chakra-ui/react";
import { useState } from "react";
import type { IconType } from "react-icons";
import { FiUser } from "react-icons/fi";
import { LuKeyRound, LuSparkles } from "react-icons/lu";
import { ProfileForm } from "@/modules/profile/components/ProfileForm";

const SECTIONS: { id: string; label: string; icon: IconType }[] = [
  { id: "profile", label: "Profile", icon: FiUser },
  { id: "api-keys", label: "API keys", icon: LuKeyRound },
  { id: "ai-settings", label: "AI settings", icon: LuSparkles },
];

export function ProfilePage() {
  const [active, setActive] = useState("profile");

  return (
    <Flex gap="32px" align="flex-start">
      <Stack as="nav" aria-label="Profile sections" spacing="4px" w="200px" flexShrink={0} position="sticky" top="92px" display={{ base: "none", lg: "flex" }}>
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
              gap="12px"
              h="40px"
              px="12px"
              borderRadius="md"
              bg={on ? "accent.soft" : "transparent"}
              color={on ? "accent.text" : "fg.muted"}
              fontWeight={on ? 600 : 500}
              _hover={on ? undefined : { bg: "bg.subtle" }}
            >
              <Icon as={s.icon} boxSize="16px" />
              {s.label}
            </Flex>
          );
        })}
      </Stack>
      <Box flex={1} minW={0} maxW="920px">
        <Heading as="h1" fontSize={{ base: "28px", md: "32px" }} mb="20px">
          Profile
        </Heading>
        <ProfileForm />
      </Box>
    </Flex>
  );
}
