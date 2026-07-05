import {
  Avatar,
  Box,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { FiLogOut, FiMenu, FiMoon, FiSun, FiUser } from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/modules/auth/hooks/useAuth";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { MobileAppDownloadButton } from "@/components/layout/MobileAppDownloadButton";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const logout = useLogout();
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/login"),
    });
  };

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      px={{ base: 4, md: 6 }}
      h="16"
      bg={bg}
      borderBottomWidth="1px"
      borderColor={borderColor}
      position="sticky"
      top={0}
      zIndex="sticky"
    >
      <HStack spacing={3}>
        <IconButton
          aria-label="Toggle sidebar"
          icon={<FiMenu />}
          variant="ghost"
          display={{ base: "flex", lg: "none" }}
          onClick={onToggleSidebar}
        />
        <Link to="/dashboard">
          <HStack spacing={2}>
            <Box
              w={8}
              h={8}
              bg="brand.500"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontWeight="bold"
              fontSize="sm"
            >
              TP
            </Box>
            <Text fontWeight="bold" fontSize="lg" display={{ base: "none", sm: "block" }}>
              TripPlanner
            </Text>
          </HStack>
        </Link>
      </HStack>

      <HStack spacing={2}>
        <MobileAppDownloadButton />
        <NotificationBell />
        <IconButton
          aria-label="Toggle color mode"
          icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
          variant="ghost"
          onClick={toggleColorMode}
        />

        <Menu>
          <MenuButton>
            <HStack spacing={2} cursor="pointer">
              <Avatar size="sm" name={user?.name ?? "User"} src={user?.avatar ?? undefined} />
              <Text fontSize="sm" fontWeight="medium" display={{ base: "none", md: "block" }}>
                {user?.name}
              </Text>
            </HStack>
          </MenuButton>
          <MenuList>
            <MenuItem as={Link} to="/profile" icon={<FiUser />}>
              Profile
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
}
