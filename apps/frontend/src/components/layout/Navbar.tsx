import {
  Avatar,
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
} from "@chakra-ui/react";
import { FiChevronDown, FiLogOut, FiMenu, FiMoon, FiSun, FiUser } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/modules/auth/hooks/useAuth";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { useProfileQuery } from "@/modules/profile/hooks/useProfile";

const PROVIDER_LABEL = { openai: "OpenAI", gemini: "Gemini" } as const;

/** "AI on · Gemini" (or "AI off") — links to Profile where keys and the model are set. */
export function AiStatusChip() {
  const { data } = useProfileQuery();
  const active = data?.profile.ai.activeProvider ?? null;
  return (
    <HStack
      as={Link}
      to="/profile"
      spacing="6px"
      h="28px"
      px="10px"
      borderRadius="sm"
      bg={active ? "acSoft" : "sunk"}
      color={active ? "ac" : "tx2"}
      fontSize="12px"
      fontWeight={600}
      _hover={{ boxShadow: "inset 0 0 0 1px var(--chakra-colors-acLine)" }}
      display={{ base: "none", md: "inline-flex" }}
      title={active ? "AI features are on — change the provider or model in Profile" : "Add an OpenAI or Gemini key in Profile to turn on AI"}
    >
      <Icon as={LuSparkles} boxSize="14px" />
      <span>{active ? `AI on · ${PROVIDER_LABEL[active]}` : "AI off"}</span>
    </HStack>
  );
}

export function ColorModeButton() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label={colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      icon={colorMode === "light" ? <FiMoon size={20} /> : <FiSun size={20} />}
      variant="ghost"
      colorScheme="gray"
      borderRadius="full"
      onClick={toggleColorMode}
    />
  );
}

interface NavbarProps {
  title: string;
  onToggleSidebar?: () => void;
}

export function Navbar({ title, onToggleSidebar }: NavbarProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      // Sign out of the shared account too, when the identity server offers it.
      onSuccess: ({ endSessionUrl }) => (endSessionUrl ? window.location.assign(endSessionUrl) : navigate("/login")),
      onError: () => navigate("/login"),
    });
  };

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      h={{ base: "60px", md: "72px" }}
      flexShrink={0}
      px={{ base: 4, md: 6, lg: 8 }}
      bg="bg"
      borderBottomWidth="1px"
      borderColor="ln"
      position="sticky"
      top={0}
      zIndex="sticky"
    >
      <HStack spacing={3} minW={0}>
        {onToggleSidebar && (
          <IconButton aria-label="Open menu" icon={<FiMenu size={20} />} variant="ghost" colorScheme="gray" borderRadius="full" display={{ base: "inline-flex", lg: "none" }} onClick={onToggleSidebar} />
        )}
        <Box display={{ base: "block", lg: "none" }}>
          <Link to="/dashboard">
            <BrandLogo />
          </Link>
        </Box>
        <Text as="span" fontWeight={600} fontSize="17px" lineHeight="24px" noOfLines={1} display={{ base: "none", lg: "block" }}>
          {title}
        </Text>
      </HStack>

      <HStack spacing={2}>
        <AiStatusChip />
        <NotificationBell />
        <ColorModeButton />
        <Menu placement="bottom-end">
          <MenuButton aria-label="User menu" h="40px" pl={0.5} pr={2} borderRadius="full" _hover={{ bg: "sunk" }} _focusVisible={{ outline: "3px solid", outlineColor: "ac", outlineOffset: "3px" }}>
            <HStack spacing={2}>
              <Avatar size="sm" w="36px" h="36px" fontSize="13px" name={user?.name ?? "User"} src={user?.avatar ?? undefined} bg="tx" color="bg" />
              <Text fontWeight={600} display={{ base: "none", md: "block" }}>
                {user?.name?.split(" ")[0]}
              </Text>
              <Icon as={FiChevronDown} boxSize="16px" display={{ base: "none", md: "block" }} color="tx2" />
            </HStack>
          </MenuButton>
          <MenuList>
            <MenuItem as={Link} to="/profile" icon={<FiUser />}>
              Profile & API keys
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
              Log out
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
}
