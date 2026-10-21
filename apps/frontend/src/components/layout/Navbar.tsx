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
      spacing={1.5}
      h="32px"
      px={3}
      borderRadius="full"
      bg={active ? "accent.soft" : "bg.subtle"}
      color={active ? "accent.text" : "fg.muted"}
      fontSize="13px"
      fontWeight={500}
      _hover={{ textDecoration: "underline" }}
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
      icon={colorMode === "light" ? <FiMoon size={18} /> : <FiSun size={18} />}
      variant="ghost"
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
      h="60px"
      flexShrink={0}
      px={{ base: 4, md: 7 }}
      bg="bg.surface"
      borderBottomWidth="1px"
      borderColor="border.line"
      position="sticky"
      top={0}
      zIndex="sticky"
    >
      <HStack spacing={3} minW={0}>
        {onToggleSidebar && (
          <IconButton aria-label="Open menu" icon={<FiMenu size={18} />} variant="ghost" display={{ base: "inline-flex", lg: "none" }} onClick={onToggleSidebar} />
        )}
        <Box display={{ base: "block", lg: "none" }}>
          <Link to="/dashboard">
            <BrandLogo size={28} fontSize="18px" />
          </Link>
        </Box>
        <Text fontWeight={600} fontSize="15px" noOfLines={1} display={{ base: "none", lg: "block" }}>
          {title}
        </Text>
      </HStack>

      <HStack spacing={2}>
        <AiStatusChip />
        <NotificationBell />
        <ColorModeButton />
        <Menu placement="bottom-end">
          <MenuButton aria-label="User menu" h="36px" pl={1} pr={1.5} borderRadius="md" _hover={{ bg: "bg.subtle" }}>
            <HStack spacing={2}>
              <Avatar size="sm" w="30px" h="30px" name={user?.name ?? "User"} src={user?.avatar ?? undefined} bg="day.1" color="pin.fg" />
              <Text fontWeight={600} display={{ base: "none", md: "block" }}>
                {user?.name?.split(" ")[0]}
              </Text>
              <Icon as={FiChevronDown} display={{ base: "none", md: "block" }} color="fg.muted" />
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
